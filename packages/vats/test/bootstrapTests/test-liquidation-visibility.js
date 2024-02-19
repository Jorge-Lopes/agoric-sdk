/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test vaults liquidation visibility
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeLiquidationTestContext } from './liquidation.js';
import {
  addNewVaults,
  checkVisibility,
  ensureVaultCollateral,
  initVaults,
  startAuction,
} from './liquidation-visibility-utils.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeLiquidationTestContext>>>}
 */
const test = anyTest;

//#region Product spec
const setup = /** @type {const} */ ({
  // Vaults are sorted in the worst debt/col ratio to the best
  vaults: [
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
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
});

const outcome = /** @type {const} */ ({
  reserve: {
    allocations: {
      ATOM: 0.309852,
      STARS: 0.309852,
    },
    shortfall: 0,
  },
  // The order in the setup preserved
  vaults: [
    {
      locked: 2.846403,
    },
    {
      locked: 3.0779,
    },
    {
      locked: 3.425146,
    },
  ],
});
//#endregion

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
});

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
    managerIndex: 0,
    setupCallback: () =>
      initVaults({
        t,
        collateralBrandKey: 'ATOM',
        managerIndex: 0,
        setup,
      }),
    setup,
    outcome,
  });
});

test.serial('add-STARS-collateral', async t => {
  await ensureVaultCollateral('STARS', t);
  await t.context.setupStartingState();
  t.pass(); // reached here without throws
});

test.serial('restart-vault-factory', async t => {
  const {
    runUtils: { EV },
  } = t.context;
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const { privateArgs } = vaultFactoryKit;
  console.log('reused privateArgs', privateArgs, vaultFactoryKit);

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  t.log('awaiting VaultFactory restartContract');
  const upgradeResult = await EV(vfAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
});

test.serial('restart contractGovernor', async t => {
  const { EV } = t.context.runUtils;
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const { governorAdminFacet } = vaultFactoryKit;
  // has no privateArgs of its own. the privateArgs.governed is only for the
  // contract startInstance. any changes to those privateArgs have to happen
  // through a restart or upgrade using the governed contract's adminFacet
  const privateArgs = undefined;

  t.log('awaiting CG restartContract');
  const upgradeResult = await EV(governorAdminFacet).restartContract(
    privateArgs,
  );
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
});

test.serial('no-unnecessary-storage-nodes', async t => {
  const {
    runUtils: { EV },
    readLatest,
  } = t.context;
  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const { nextAuctionSchedule } = await EV(
    auctioneerKit.publicFacet,
  ).getSchedules();
  t.log('nextAuctionSchedule', nextAuctionSchedule);
  await startAuction(t);

  const scheduleNotification = readLatest('published.auction.schedule');
  t.log('scheduleNotification', scheduleNotification);

  // Make sure the auction started properly
  t.is(
    nextAuctionSchedule.startTime.absValue,
    scheduleNotification.activeStartTime.absValue,
  );

  t.throws(
    () =>
      readLatest(
        `published.vaultFactory.managers.manager0.liquidations.${scheduleNotification.activeStartTime.absValue.toString()}`,
      ),
    {
      message: `no data for "published.vaultFactory.managers.manager0.liquidations.${scheduleNotification.activeStartTime.absValue.toString()}"`,
    },
  );
});

test.serial('visibility-after-upgrade', async t => {
  await checkVisibility({
    t,
    managerIndex: 0,
    setupCallback: () =>
      addNewVaults({
        t,
        collateralBrandKey: 'ATOM',
        setup,
        base: setup.vaults.length,
      }),
    setup,
    outcome,
    base: 3,
  });
});

test.serial('here-check-STARS-visibility', async t => {
  await checkVisibility({
    t,
    managerIndex: 1,
    setupCallback: () =>
      addNewVaults({
        t,
        collateralBrandKey: 'STARS',
        setup,
        base: 0,
      }),
    setup,
    outcome,
  });
});

test.serial('snapshot-storage', async t => {
  const { readLatest } = t.context;

  const buildSnapshotItem = (paths, managerIndex, auctionTime) => {
    const basePath = `published.vaultFactory.managers.manager${managerIndex}.liquidations.${auctionTime}`;
    const item = {};
    for (const path of paths) {
      const exactPath = `${basePath}.${path}`;
      item[exactPath] = readLatest(exactPath);
    }
    t.snapshot(Object.entries(item));
  };

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    0,
    3600n,
  );

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    0,
    10800n,
  );

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    1,
    14400n,
  );
});
