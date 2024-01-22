import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeImportContext } from '@agoric/smart-wallet/src/marshal-contexts.js';
import { makeMockChainStorageRoot } from '../supports.js';
import { assertNodeInStorage } from './assertions.js';

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
