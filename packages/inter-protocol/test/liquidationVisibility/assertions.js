import '@agoric/zoe/exported.js';
import { E } from '@endo/eventual-send';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { subscriptionTracker } from '../metrics.js';
import { AmountMath } from '@agoric/ertp';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { subscribeEach } from '@agoric/notifier';

export const assertBidderPayout = async (
  t,
  bidderSeat,
  run,
  curr,
  aeth,
  coll,
) => {
  const bidderResult = await E(bidderSeat).getOfferResult();
  t.is(bidderResult, 'Your bid has been accepted');
  const payouts = await E(bidderSeat).getPayouts();
  const { Collateral: bidderCollateral, Bid: bidderBid } = payouts;
  (!bidderBid && curr === 0n) ||
    (await assertPayoutAmount(t, run.issuer, bidderBid, run.make(curr)));
  (!bidderCollateral && coll === 0n) ||
    (await assertPayoutAmount(
      t,
      aeth.issuer,
      bidderCollateral,
      aeth.make(coll),
      'amount ',
    ));
};

export const assertReserveState = async (t, metricsTopic, method, expected) => {
  const m = await subscriptionTracker(t, metricsTopic);

  switch (method) {
    case 'initial':
      await m.assertInitial(expected);
      break;
    case 'like':
      await m.assertLike(expected);
      break;
    case 'state':
      await m.assertState(expected);
      break;
  }
};

export const assertVaultCurrentDebt = async (t, vault, debt) => {
  const debtAmount = await E(vault).getCurrentDebt();

  if (debt === 0n) {
    t.deepEqual(debtAmount.value, debt);
    return;
  }

  const fee = ceilMultiplyBy(debt, t.context.rates.mintFee);

  t.deepEqual(
    debtAmount,
    AmountMath.add(debt, fee),
    'borrower Minted amount does not match Vault current debt',
  );
};

export const assertVaultCollateral = async (t, vault, collateralValue) => {
  const collateralAmount = await E(vault).getCollateralAmount();

  t.deepEqual(collateralAmount, t.context.aeth.make(collateralValue));
};

export const assertMintedAmount = async (t, vaultSeat, wantMinted) => {
  const { Minted } = await E(vaultSeat).getFinalAllocation();

  t.truthy(AmountMath.isEqual(Minted, wantMinted));
};

export const assertVaultLocked = async (t, vaultNotifier, lockedValue) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const lockedAmount = notification.value.locked;

  t.deepEqual(lockedAmount, t.context.aeth.make(lockedValue));
};

export const assertVaultDebtSnapshot = async (t, vaultNotifier, wantMinted) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const debtSnapshot = notification.value.debtSnapshot;
  const fee = ceilMultiplyBy(wantMinted, t.context.rates.mintFee);

  t.deepEqual(debtSnapshot, {
    debt: AmountMath.add(wantMinted, fee),
    interest: makeRatio(100n, t.context.run.brand),
  });
};

export const assertVaultState = async (t, vaultNotifier, phase) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const vaultState = notification.value.vaultState;

  t.is(vaultState, phase);
};

export const assertVaultSeatExited = async (t, vaultSeat) => {
  t.truthy(await E(vaultSeat).hasExited());
};

export const assertVaultFactoryRewardAllocation = async (
  t,
  vaultFactory,
  rewardValue,
) => {
  const rewardAllocation = await E(vaultFactory).getRewardAllocation();

  t.deepEqual(rewardAllocation, {
    Minted: t.context.run.make(rewardValue),
  });
};

export const assertCollateralProceeds = async (
  t,
  proceedsCollateralPayment,
  collProceedsValue,
) => {
  const collProceeds = await t.context.aeth.issuer.getAmountOf(
    proceedsCollateralPayment,
  );

  t.deepEqual(collProceeds, t.context.aeth.make(collProceedsValue));
};

// Update these assertions to use a tracker similar to test-auctionContract
export const assertBookData = async (
  t,
  auctioneerBookDataSubscriber,
  expectedBookData,
) => {
  const auctioneerBookData = await E(
    auctioneerBookDataSubscriber,
  ).getUpdateSince();

  t.deepEqual(auctioneerBookData.value, expectedBookData);
};

export const assertAuctioneerSchedule = async (
  t,
  auctioneerPublicTopics,
  expectedSchedule,
) => {
  const auctioneerSchedule = await E(
    auctioneerPublicTopics.schedule.subscriber,
  ).getUpdateSince();

  t.deepEqual(auctioneerSchedule.value, expectedSchedule);
};