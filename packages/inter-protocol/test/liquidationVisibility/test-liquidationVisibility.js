// @ts-nocheck

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/eventual-send';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import {
  defaultParamValues,
  legacyOfferResult,
} from '../vaultFactory/vaultFactoryUtils.js';
import {
  SECONDS_PER_HOUR as ONE_HOUR,
  SECONDS_PER_DAY as ONE_DAY,
  SECONDS_PER_WEEK as ONE_WEEK,
} from '../../src/proposals/econ-behaviors.js';
import { reserveInitialState } from '../metrics.js';
import {
  bid,
  setClockAndAdvanceNTimes,
  setupBasics,
  setupServices,
  startAuctionClock,
  getDataFromVstorage,
  openVault,
  getMetricTrackers,
  adjustVault,
  closeVault,
} from './tools.js';
import {
  assertBidderPayout,
  assertCollateralProceeds,
  assertMintedAmount,
  assertReserveState,
  assertVaultCollateral,
  assertVaultCurrentDebt,
  assertVaultDebtSnapshot,
  assertVaultFactoryRewardAllocation,
  assertVaultLocked,
  assertVaultSeatExited,
  assertVaultState,
  assertBookData,
  assertAuctioneerSchedule,
  assertAuctioneerPathData,
  assertVaultData,
  assertMintedProceeds,
} from './assertions.js';
import { Phase } from '../vaultFactory/driver.js';

const trace = makeTracer('TestLiquidationVisibility', false);

// IST is set as RUN to be able to use ../supports.js methods

test.before(async t => {
  const { zoe, feeMintAccessP } = await setUpZoeForTest();
  const feeMintAccess = await feeMintAccessP;

  const { run, aeth, bundleCache, bundles, installation } =
    await setupBasics(zoe);

  const contextPs = {
    zoe,
    feeMintAccess,
    bundles,
    installation,
    electorateTerms: undefined,
    interestTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 10n,
    },
    minInitialDebt: 50n,
    referencedUi: undefined,
    rates: defaultParamValues(run.brand),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));

  t.context = {
    ...frozenCtx,
    bundleCache,
    aeth,
    run,
  };

  trace(t, 'CONTEXT');
});

// Liquidation ends with a happy path
test('liq-result-scenario-1', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { vaultFactory, aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
  } = services;

  const { reserveTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  let expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(reserveTracker, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount,
    colKeyword: 'aeth',
    wantMintedAmount: wantMinted,
  });

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  await assertVaultCurrentDebt(t, vault, wantMinted);
  await assertVaultState(t, vaultNotifier, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifier, wantMinted);
  await assertMintedAmount(t, vaultSeat, wantMinted);
  await assertVaultCollateral(t, vault, 400n);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  await assertVaultState(t, vaultNotifier, 'active');

  const { startTime, time } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );
  let currentTime = time;

  await assertVaultState(t, vaultNotifier, 'liquidating');
  await assertVaultCollateral(t, vault, 0n);
  await assertVaultCurrentDebt(t, vault, wantMinted);

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);
  trace(`advanced time to `, currentTime);

  await assertVaultState(t, vaultNotifier, 'liquidated');
  await assertVaultSeatExited(t, vaultSeat);
  await assertVaultLocked(t, vaultNotifier, 0n);
  await assertVaultCurrentDebt(t, vault, 0n);
  await assertVaultFactoryRewardAllocation(t, vaultFactory, 80n);

  const closeSeat = await closeVault({ t, vault });
  await E(closeSeat).getOfferResult();

  await assertCollateralProceeds(t, closeSeat, aeth.makeEmpty());
  await assertVaultCollateral(t, vault, 0n);
  await assertBidderPayout(t, bidderSeat, run, 320n, aeth, 400n);

  expectedReserveState = {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(reserveTracker, 'like', expectedReserveState);
});

// We'll make a loan, and trigger liquidation via price changes. The interest
// rate is 40%. The liquidation margin is 105%. The priceAuthority will
// initially quote 10:1 Run:Aeth, and drop to 7:1. The loan will initially be
// overcollateralized 100%. Alice will withdraw enough of the overage that
// she'll get caught when prices drop.
// A bidder will buy at the 65% level, so there will be a shortfall.
test('liq-result-scenario-2', async t => {
  const { zoe, aeth, run, rates: defaultRates } = t.context;

  // Add a vaultManager with 10000 aeth collateral at a 200 aeth/Minted rate
  const rates = harden({
    ...defaultRates,
    // charge 40% interest / year
    interestRate: run.makeRatio(40n),
    liquidationMargin: run.makeRatio(130n),
  });
  t.context.rates = rates;

  // Interest is charged daily, and auctions are every week
  t.context.interestTiming = {
    chargingPeriod: ONE_DAY,
    recordingPeriod: ONE_DAY,
  };

  const manualTimer = buildManualTimer();
  const services = await setupServices(
    t,
    makeRatio(100n, run.brand, 10n, aeth.brand),
    aeth.make(1n),
    manualTimer,
    ONE_WEEK,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
    auctioneerKit,
  } = services;
  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const { reserveTracker, collateralManagerTracker } = await getMetricTrackers({
    t,
    collateralManager: aethCollateralManager,
    reservePublicFacet,
  });

  await assertReserveState(
    reserveTracker,
    'initial',
    reserveInitialState(run.makeEmpty()),
  );
  let shortfallBalance = 0n;

  await collateralManagerTracker.assertInitial({
    // present
    numActiveVaults: 0,
    numLiquidatingVaults: 0,
    totalCollateral: aeth.make(0n),
    totalDebt: run.make(0n),
    retainedCollateral: aeth.make(0n),

    // running
    numLiquidationsCompleted: 0,
    numLiquidationsAborted: 0,
    totalOverageReceived: run.make(0n),
    totalProceedsReceived: run.make(0n),
    totalCollateralSold: aeth.make(0n),
    liquidatingCollateral: aeth.make(0n),
    liquidatingDebt: run.make(0n),
    totalShortfallReceived: run.make(0n),
    lockedQuote: null,
  });

  // ALICE's loan ////////////////////////////////////////////

  // Create a loan for Alice for 5000 Minted with 1000 aeth collateral
  // ratio is 4:1
  const aliceCollateralAmount = aeth.make(1000n);
  const aliceWantMinted = run.make(5000n);
  /** @type {UserSeat<VaultKit>} */
  const aliceVaultSeat = await openVault({
    t,
    cm: aethCollateralManager,
    collateralAmount: aliceCollateralAmount,
    wantMintedAmount: aliceWantMinted,
    colKeyword: 'aeth',
  });
  const {
    vault: aliceVault,
    publicNotifiers: { vault: aliceNotifier },
  } = await legacyOfferResult(aliceVaultSeat);

  await assertVaultCurrentDebt(t, aliceVault, aliceWantMinted);
  await assertMintedProceeds(t, aliceVaultSeat, aliceWantMinted);
  await assertVaultDebtSnapshot(t, aliceNotifier, aliceWantMinted);

  await collateralManagerTracker.assertChange({
    numActiveVaults: 1,
    totalCollateral: { value: 1000n },
    totalDebt: { value: 5250n },
  });

  // reduce collateral  /////////////////////////////////////

  trace(t, 'alice reduce collateral');

  // Alice reduce collateral by 300. That leaves her at 700 * 10 > 1.05 * 5000.
  // Prices will drop from 10 to 7, she'll be liquidated: 700 * 7 < 1.05 * 5000.
  const collateralDecrement = aeth.make(300n);
  const aliceReduceCollateralSeat = await adjustVault({
    t,
    vault: aliceVault,
    proposal: {
      want: { Collateral: collateralDecrement },
    },
  });
  await E(aliceReduceCollateralSeat).getOfferResult();

  trace('alice ');
  await assertCollateralProceeds(t, aliceReduceCollateralSeat, aeth.make(300n));

  await assertVaultDebtSnapshot(t, aliceNotifier, aliceWantMinted);
  trace(t, 'alice reduce collateral');
  await collateralManagerTracker.assertChange({
    totalCollateral: { value: 700n },
  });

  await E(aethTestPriceAuthority).setPrice(
    makeRatio(70n, run.brand, 10n, aeth.brand),
  );
  trace(t, 'changed price to 7 RUN/Aeth');

  // A BIDDER places a BID //////////////////////////
  const bidAmount = run.make(3300n);
  const desired = aeth.make(700n);
  const bidderSeat = await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const { startTime: start1, time: now1 } = await startAuctionClock(
    auctioneerKit,
    manualTimer,
  );
  let currentTime = now1;

  await collateralManagerTracker.assertChange({
    lockedQuote: makeRatioFromAmounts(
      aeth.make(1_000_000n),
      run.make(7_000_000n),
    ),
  });

  // expect Alice to be liquidated because her collateral is too low.
  await assertVaultState(t, aliceNotifier, Phase.LIQUIDATING);

  currentTime = await setClockAndAdvanceNTimes(manualTimer, 2, start1, 2n);

  await assertVaultState(t, aliceNotifier, Phase.LIQUIDATED);
  trace(t, 'alice liquidated', currentTime);
  await collateralManagerTracker.assertChange({
    numActiveVaults: 0,
    numLiquidatingVaults: 1,
    liquidatingCollateral: { value: 700n },
    liquidatingDebt: { value: 5250n },
    lockedQuote: null,
  });

  shortfallBalance += 2065n;
  await reserveTracker.assertChange({
    shortfallBalance: { value: shortfallBalance },
  });

  await collateralManagerTracker.assertChange({
    liquidatingDebt: { value: 0n },
    liquidatingCollateral: { value: 0n },
    totalCollateral: { value: 0n },
    totalDebt: { value: 0n },
    numLiquidatingVaults: 0,
    numLiquidationsCompleted: 1,
    totalCollateralSold: { value: 700n },
    totalProceedsReceived: { value: 3185n },
    totalShortfallReceived: { value: shortfallBalance },
  });

  //  Bidder bought 800 Aeth
  await assertBidderPayout(t, bidderSeat, run, 115n, aeth, 700n);
});