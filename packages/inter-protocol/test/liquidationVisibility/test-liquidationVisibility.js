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
import {
  defaultParamValues,
  legacyOfferResult,
} from '../vaultFactory/vaultFactoryUtils.js';
import { SECONDS_PER_HOUR as ONE_HOUR } from '../../src/proposals/econ-behaviors.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { reserveInitialState } from '../metrics.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  bid,
  setClockAndAdvanceNTimes,
  setupBasics,
  setupServices,
  startAuctionClock,
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
} from './assertions.js';
import { AmountMath } from '@agoric/ertp';
import { makeManagerDriver } from '../vaultFactory/driver.js';

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
      recordingPeriod: 6n,
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

test('test create new vault', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  // describe the purpose of interestTiming
  t.context.interestTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    reserveKit: { reserveCreatorFacet, reservePublicFacet },
  } = services;

  const metricsTopic = await E.get(E(reservePublicFacet).getPublicTopics())
    .metrics;

  let expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(t, metricsTopic, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await E(zoe).offer(
    await E(aethCollateralManager).makeVaultInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Minted: wantMinted },
    }),
    harden({
      Collateral: aeth.mint.mintPayment(collateralAmount),
    }),
  );

  const {
    vault,
    publicNotifiers: { vault: vaultNotifier },
  } = await legacyOfferResult(vaultSeat);

  await assertVaultCurrentDebt(t, vault, wantMinted);
  await assertVaultState(t, vaultNotifier, 'active');
  await assertVaultDebtSnapshot(t, vaultNotifier, wantMinted);
  await assertMintedAmount(t, vaultSeat, wantMinted);
  await assertVaultCollateral(t, vault, 400n);
});

test('test vault liquidation ', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  // describe the purpose of interestTiming
  t.context.interestTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

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

  const metricsTopic = await E.get(E(reservePublicFacet).getPublicTopics())
    .metrics;

  let expectedReserveState = reserveInitialState(run.makeEmpty());
  await assertReserveState(t, metricsTopic, 'initial', expectedReserveState);

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await E(zoe).offer(
    await E(aethCollateralManager).makeVaultInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Minted: wantMinted },
    }),
    harden({
      Collateral: aeth.mint.mintPayment(collateralAmount),
    }),
  );

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

  const closeSeat = await E(zoe).offer(E(vault).makeCloseInvitation());
  await E(closeSeat).getOfferResult();

  const closeProceeds = await E(closeSeat).getPayouts();

  await assertCollateralProceeds(t, closeProceeds.Collateral, 0n);
  await assertVaultCollateral(t, vault, 0n);
  await assertBidderPayout(t, bidderSeat, run, 320n, aeth, 400n);

  expectedReserveState = {
    allocations: {
      Aeth: undefined,
      Fee: undefined,
    },
  };
  await assertReserveState(t, metricsTopic, 'like', expectedReserveState);
});

test('test liquidate vault with snapshot', async t => {
  const { zoe, run, aeth } = t.context;
  const manualTimer = buildManualTimer();

  t.context.interestTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet },
    auctioneerKit,
  } = services;

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await E(zoe).offer(
    await E(aethCollateralManager).makeVaultInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Minted: wantMinted },
    }),
    harden({
      Collateral: aeth.mint.mintPayment(collateralAmount),
    }),
  );

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const { vault } = await legacyOfferResult(vaultSeat);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  const { startTime } = await startAuctionClock(auctioneerKit, manualTimer);

  await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);

  const closeSeat = await E(zoe).offer(E(vault).makeCloseInvitation());
  await E(closeSeat).getOfferResult();

  const storage = await services.space.consume.chainStorage;
  const doc = {
    node: 'auction',
    owner: 'the auctioneer contract',
    pattern: 'mockChainStorageRoot.auction',
    replacement: 'published.auction',
  };
  await documentStorageSchema(t, storage, doc);
});

test('test auctioneer schedule and book data', async t => {
  const { zoe, run, aeth, feeMintAccess } = t.context;
  const manualTimer = buildManualTimer();
  const timerBrand = manualTimer.getTimerBrand();

  t.context.interestTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const {
    vaultFactory: { aethCollateralManager },
    aethTestPriceAuthority,
    reserveKit: { reserveCreatorFacet },
    auctioneerKit,
  } = services;

  await E(reserveCreatorFacet).addIssuer(aeth.issuer, 'Aeth');

  const collateralAmount = aeth.make(400n);
  const wantMinted = run.make(1600n);

  const vaultSeat = await E(zoe).offer(
    await E(aethCollateralManager).makeVaultInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Minted: wantMinted },
    }),
    harden({
      Collateral: aeth.mint.mintPayment(collateralAmount),
    }),
  );

  // A bidder places a bid
  const bidAmount = run.make(2000n);
  const desired = aeth.make(400n);
  await bid(t, zoe, auctioneerKit, aeth, bidAmount, desired);

  const { vault } = await legacyOfferResult(vaultSeat);

  // drop collateral price from 5:1 to 4:1 and liquidate vault
  aethTestPriceAuthority.setPrice(makeRatio(40n, run.brand, 10n, aeth.brand));

  const { startTime } = await startAuctionClock(auctioneerKit, manualTimer);

  // Explore auctioneerKit
  // Update the auctioneer assertions to use a tracker similar to test-auctionContract
  const auctioneerPublicTopics = await E(
    auctioneerKit.publicFacet,
  ).getPublicTopics();

  const bookDataSubscriber = await E(
    auctioneerKit.publicFacet,
  ).getBookDataUpdates(aeth.brand);

  await assertBookData(t, bookDataSubscriber, {
    collateralAvailable: aeth.make(400n),
    currentPriceLevel: null,
    proceedsRaised: undefined,
    remainingProceedsGoal: null,
    startCollateral: aeth.make(400n),
    startPrice: makeRatioFromAmounts(run.make(4000000n), aeth.make(1000000n)),
    startProceedsGoal: run.make(1680n),
  });

  await assertAuctioneerSchedule(t, auctioneerPublicTopics, {
    activeStartTime: {
      absValue: 3610n,
      timerBrand,
    },
    nextDescendingStepTime: {
      absValue: 3610n,
      timerBrand,
    },
    nextStartTime: { absValue: 7210n, timerBrand },
  });

  await setClockAndAdvanceNTimes(manualTimer, 2, startTime, 2n);

  await assertBookData(t, bookDataSubscriber, {
    collateralAvailable: aeth.makeEmpty(),
    currentPriceLevel: null,
    proceedsRaised: undefined,
    remainingProceedsGoal: null,
    startCollateral: aeth.makeEmpty(),
    startPrice: null,
    startProceedsGoal: null,
  });

  await assertAuctioneerSchedule(t, auctioneerPublicTopics, {
    activeStartTime: null,
    nextDescendingStepTime: {
      absValue: 7210n,
      timerBrand,
    },
    nextStartTime: { absValue: 7210n, timerBrand },
  });
});

test('test storage keys', async t => {
  const { zoe, run, aeth, feeMintAccess } = t.context;
  const manualTimer = buildManualTimer();

  t.context.interestTiming = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const services = await setupServices(
    t,
    makeRatio(50n, run.brand, 10n, aeth.brand),
    aeth.make(400n),
    manualTimer,
    undefined,
    { StartFrequency: ONE_HOUR },
  );

  const auctioneerPublicFacet = (await services.space.consume.auctioneerKit)
    .publicFacet;

  // NOTE: the verification executed bellow can be done by the assertTopicPathData function
  // we the deference is that we need to pass the aeth.brand as an argument for the getPublicTopics
  // otherwise it will return the scheduler subscriber instead of the bookData
  const topic = await E(auctioneerPublicFacet)
    .getPublicTopics(aeth.brand)
    .then(topics => topics['bookData']);

  t.is(
    await topic?.storagePath,
    'mockChainStorageRoot.auction.book0',
    'topic storagePath must match',
  );

  const headValue = async subscriber => {
    await eventLoopIteration();
    const record = await E(subscriber).subscribeAfter();
    return record.head.value;
  };

  const latest = /** @type {Record<string, unknown>} */ (
    await headValue(topic.subscriber)
  );

  console.log(Object.keys(latest));

  const dataKeys = [
    'collateralAvailable',
    'currentPriceLevel',
    'proceedsRaised',
    'remainingProceedsGoal',
    'startCollateral',
    'startPrice',
    'startProceedsGoal',
  ];

  if (dataKeys !== undefined) {
    t.deepEqual(Object.keys(latest), dataKeys, 'keys in topic feed must match');
  }
});
