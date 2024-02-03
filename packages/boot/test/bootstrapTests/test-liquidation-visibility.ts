import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { ExecutionContext, TestFn } from 'ava';
import {
  LiquidationSetup,
  LiquidationTestContext,
  makeLiquidationTestContext, scale6
} from "../../tools/liquidation.ts";
import { ScheduleNotification } from "@agoric/inter-protocol/src/auction/scheduler.js";
import { NonNullish } from "@agoric/assert/src/assert.js";

const test = anyTest as TestFn<LiquidationTestContext>;

//#region Product spec
const atomSetup: LiquidationSetup = {
  vaults: [
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
  ],
  bids: [
    {
      give: '80IST',
      discount: 0.1,
    },
    {
      give: '90IST',
      price: 9.0,
    },
    {
      give: '150IST',
      discount: 0.15,
    },
  ],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: {
      collateral: 45,
      debt: 309.54,
    },
    end: {
      collateral: 9.659301,
      debt: 0,
    },
  },
};

const atomOutcome = {
  bids: [
    {
      payouts: {
        Bid: 0,
        Collateral: 8.897786,
      },
    },
    {
      payouts: {
        Bid: 0,
        Collateral: 10.01001,
      },
    },
    {
      payouts: {
        Bid: 10.46,
        Collateral: 16.432903,
      },
    },
  ],
  reserve: {
    allocations: {
      ATOM: 0.309852,
      STARS: 0.309852,
    },
    shortfall: 0,
  },
  vaultsSpec: [
    {
      locked: 3.373,
    },
    {
      locked: 3.024,
    },
    {
      locked: 2.792,
    },
  ],
  // TODO match spec https://github.com/Agoric/agoric-sdk/issues/7837
  vaultsActual: [
    {
      locked: 3.525747,
    },
    {
      locked: 3.181519,
    },
    {
      locked: 2.642185,
    },
  ],
} as const;
//#endregion

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
});

const checkVisibility = async ({
  t,
  setup,
  outcome,
  collateralBrandKey,
  managerIndex,
}: {
  t: ExecutionContext<LiquidationTestContext>;
  setup: LiquidationSetup;
  outcome: object;
  collateralBrandKey: string;
  managerIndex: number;
}) => {
  const {
    setupVaults,
    walletFactoryDriver,
    placeBids,
    priceFeedDrivers,
    readLatest,
    advanceTimeTo,
    advanceTimeBy,
    runUtils: { EV },
  } = t.context;

  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const schedules = await EV(auctioneerKit.publicFacet).getSchedules();
  t.log(schedules);

  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  await setupVaults(collateralBrandKey, managerIndex, setup);
  await walletFactoryDriver.provideSmartWallet('agoric1buyer');
  await placeBids(collateralBrandKey, 'agoric1buyer', setup);

  await priceFeedDrivers[collateralBrandKey].setPrice(setup.price.trigger);
  const liveSchedule: ScheduleNotification = readLatest(
    'published.auction.schedule',
  );
  t.log(liveSchedule);

  await advanceTimeTo(NonNullish(liveSchedule.nextStartTime));
  t.like(readLatest(metricsPath), {
    numActiveVaults: 0,
    numLiquidatingVaults: setup.vaults.length,
    liquidatingCollateral: {
      value: scale6(setup.auction.start.collateral),
    },
    liquidatingDebt: { value: scale6(setup.auction.start.debt) },
    lockedQuote: null,
  });

  // const advanceStepPs = Array.from({ length: 9 }, () =>
  //   advanceTimeBy(3, 'minutes'),
  // );

  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  // await advanceTimeBy(3, 'minutes');
  await advanceTimeBy(24, 'minutes');

  t.pass();
};

/**
 * @file In this file we test the below scenario:
 * - Alice opens a vault
 * - Alice gets liquidated
 * - Visibility data correctly observed in storage
 * - Vault factory gets restarted
 * - An auction starts with no vaults to liquidate
 * - No unnecessary storage node is created when `liquidateVaults` is invoked with no vaults to liquidate
 * - Bob opens a vault
 * - Bob gets liquidated
 * - Visibility data correctly observed in storage
 */
test.serial('visibility-before-upgrade', async t => {
  await checkVisibility({
    t,
    setup: atomSetup,
    outcome: atomOutcome,
    collateralBrandKey: 'ATOM',
    managerIndex: 0,
  });
});
