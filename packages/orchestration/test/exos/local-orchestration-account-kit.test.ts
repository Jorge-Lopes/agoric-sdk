import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { ChainAddress } from '../../src/orchestration-api.js';
import { NANOSECONDS_PER_SECOND } from '../../src/utils/time.js';
import { commonSetup } from '../supports.js';
import { UNBOND_PERIOD_SECONDS } from '../ibc-mocks.js';
import { maxClockSkew } from '../../src/utils/cosmos.js';
import { prepareMakeTestLOAKit } from './make-test-loa-kit.js';
import { buildVTransferEvent } from '../../tools/ibc-mocks.js';

test('deposit, withdraw', async t => {
  const common = await commonSetup(t);
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common.bootstrap);
  const account = await makeTestLOAKit();

  const {
    brands: { bld: stake },
    utils,
  } = common;

  const oneHundredStakePmt = await utils.pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  await E(account).deposit(oneHundredStakePmt);
  // FIXME #9211
  // t.deepEqual(await E(account).getBalance('ubld'), stake.units(100));

  // XXX races in the bridge
  await eventLoopIteration();
  const withdrawal1 = await E(account).withdraw(stake.units(50));
  t.true(
    AmountMath.isEqual(
      await stake.issuer.getAmountOf(withdrawal1),
      stake.units(50),
    ),
  );

  await t.throwsAsync(
    E(account).withdraw(stake.units(51)),
    undefined,
    'fails to overwithdraw',
  );
  await t.notThrowsAsync(
    E(account).withdraw(stake.units(50)),
    'succeeeds at exactly empty',
  );
  await t.throwsAsync(
    E(account).withdraw(stake.make(1n)),
    undefined,
    'fails to overwithdraw',
  );
});

test('delegate, undelegate', async t => {
  const common = await commonSetup(t);
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common.bootstrap);
  const account = await makeTestLOAKit();

  const {
    bootstrap: { timer },
    brands: { bld },
    utils,
  } = common;

  await E(account).deposit(await utils.pourPayment(bld.units(100)));

  const validatorAddress = 'agoric1validator1';

  // Because the bridge is fake,
  // 1. these succeed even if funds aren't available
  // 2. there are no return values
  // 3. there are no side-effects such as assets being locked
  await E(account).delegate(validatorAddress, bld.units(999));
  const undelegateP = E(account).undelegate(validatorAddress, bld.units(999));
  const completionTime = UNBOND_PERIOD_SECONDS + maxClockSkew;

  const notTooSoon = Promise.race([
    timer.wakeAt(completionTime - 1n).then(() => true),
    undelegateP,
  ]);
  timer.advanceTo(completionTime, 'end of unbonding period');
  t.true(await notTooSoon, "undelegate doesn't resolve before completion_time");
  t.is(
    await undelegateP,
    undefined,
    'undelegate returns void after completion_time',
  );
});

test('transfer', async t => {
  const common = await commonSetup(t);
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common.bootstrap);
  const account = await makeTestLOAKit();

  const {
    brands: { bld: stake },
    utils,
  } = common;

  t.truthy(account, 'account is returned');

  const oneHundredStakePmt = await utils.pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  await E(account).deposit(oneHundredStakePmt);
  // FIXME #9211
  // t.deepEqual(await E(account).getBalance('ubld'), stake.units(100));

  const destination: ChainAddress = {
    chainId: 'cosmoshub-4',
    value: 'cosmos1pleab',
    encoding: 'bech32',
  };

  // TODO #9211, support ERTP amounts
  t.log('ERTP Amounts not yet supported for AmountArg');
  await t.throwsAsync(() => E(account).transfer(stake.units(1), destination), {
    message: 'ERTP Amounts not yet supported',
  });

  t.log('.transfer() 1 bld to cosmos using DenomAmount');
  const transferResp = await E(account).transfer(
    { denom: 'ubld', value: 1_000_000n },
    destination,
  );
  t.is(transferResp, undefined, 'Successful transfer returns Promise<void>.');

  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 504n }, destination),
    {
      message: 'simulated unexpected MsgTransfer packet timeout',
    },
  );

  const unknownDestination: ChainAddress = {
    chainId: 'fakenet',
    value: 'fakenet1pleab',
    encoding: 'bech32',
  };
  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 1n }, unknownDestination),
    { message: /connection not found: agoric-3<->fakenet/ },
    'cannot create transfer msg with unknown chainId',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        memo: 'hello',
      }),
    'can create transfer msg with memo',
  );
  // TODO, intercept/spy the bridge message to see that it has a memo

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        // sets to current time, which shouldn't work in a real env
        timeoutTimestamp: BigInt(new Date().getTime()) * NANOSECONDS_PER_SECOND,
      }),
    'accepts custom timeoutTimestamp',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        timeoutHeight: { revisionHeight: 100n, revisionNumber: 1n },
      }),
    'accepts custom timeoutHeight',
  );
});

test('monitor transfers', async t => {
  const common = await commonSetup(t);
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common.bootstrap);
  const account = await makeTestLOAKit();
  const {
    mocks: { transferBridge },
    bootstrap: { rootZone },
  } = common;

  let upcallCount = 0;
  const zone = rootZone.subZone('tap');
  const tap: TargetApp = zone.exo('tap', undefined, {
    receiveUpcall: (obj: unknown) => {
      upcallCount += 1;
      t.log('receiveUpcall', obj);
      return Promise.resolve();
    },
  });

  const { value: target } = await E(account).getAddress();
  const appRegistration = await E(account).monitorTransfers(tap);

  // simulate upcall from golang to VM
  const simulateIncomingTransfer = async () =>
    E(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: target,
      }),
    );

  await simulateIncomingTransfer();
  t.is(upcallCount, 1, 'first upcall received');
  await simulateIncomingTransfer();
  t.is(upcallCount, 2, 'second upcall received');

  await appRegistration.revoke();
  await t.throwsAsync(simulateIncomingTransfer());
  t.is(upcallCount, 2, 'no more events after app is revoked');
});
