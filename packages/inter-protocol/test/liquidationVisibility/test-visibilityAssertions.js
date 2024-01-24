import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E, Far } from '@endo/far';
import { makeImportContext } from '@agoric/smart-wallet/src/marshal-contexts.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeMockChainStorageRoot } from '../supports.js';
import { assertNodeInStorage, assertStorageData } from './assertions.js';

const {
  fromBoard: { toCapData },
} = makeImportContext();

const writeToStorage = async (storageNode, data) => {
  await E(storageNode).setValue(
    JSON.stringify(toCapData(JSON.stringify(data))),
  );
};

test('storage-node-created', async t => {
  const storageRoot = makeMockChainStorageRoot();

  await assertNodeInStorage({
    t,
    rootNode: storageRoot,
    desiredNode: 'test',
    expected: false,
  });

  const testNode = await E(storageRoot).makeChildNode('test');
  await writeToStorage(testNode, { dummy: 'foo' });

  await assertNodeInStorage({
    t,
    rootNode: storageRoot,
    desiredNode: 'test',
    expected: true,
  });
});

test('storage-assert-data', async t => {
  const storageRoot = makeMockChainStorageRoot();
  const testNode = await E(storageRoot).makeChildNode('dummyNode');
  await writeToStorage(testNode, { dummy: 'foo' });

  await assertStorageData({
    t,
    path: 'dummyNode',
    storageRoot,
    board: {},
    expected: { dummy: 'foo' },
  });
});

test('map-test-auction', async t => {
  const vaultData = makeScalarBigMapStore('Vaults');

  vaultData.init(
    Far('key', { getId: () => 1, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key1', { getId: () => 2, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key2', { getId: () => 3, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key3', { getId: () => 4, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );

  const preAuction = [...vaultData.entries()].map(([vault, data]) => [
    vault.getId(),
    { ...data, phase: vault.getPhase() }
  ]);
  t.log(preAuction);

  t.pass();
});
