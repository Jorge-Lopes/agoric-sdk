/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
// @ts-ignore
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';

import { gzip } from 'zlib';
import { promisify } from 'util';
import { Buffer } from 'buffer';

/** @typedef {import('fs').promises['readFile']} PromisifiedFSReadFile */

/** @param {PromisifiedFSReadFile} readFile */
const makeCompressFile = readFile => async filePath => {
  const fileContents = await readFile(filePath, 'utf8');
  const buffer = Buffer.from(fileContents, 'utf-8');
  const compressed = await promisify(gzip)(buffer);
  return compressed;
};

// @ts-ignore
test.before(t => (t.context.compressFile = makeCompressFile(fs.readFile)));

test('proposal builder generates compressed bundles less than 1MB', async t => {
  const stdout = execSync(
    'agoric run /Users/jorgelopes/Documents/GitHub/Agoric/sow6/liquidation-visibility/agoric-sdk-liquidation-visibility/packages/builders/scripts/inter-protocol/liquidationVisibility/proposal-builder.js',
    { encoding: 'utf8' },
  );
  t.log('agoric run stdout:', stdout);
  t.truthy(stdout, 'Proposal successfully bundled.');

  const regex = /agd tx swingset install-bundle @(.*?)\.json/g;
  const bundles = Array.from(stdout.matchAll(regex), m => `${m[1]}.json`);
  t.assert(bundles.length, 'Found bundles in stdout');

  for (const bundle of bundles) {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    // @ts-ignore
    const buffer = await t.context.compressFile(bundle);
    t.assert(buffer);
    const sizeInMb = buffer.length / (1024 * 1024);
    t.assert(sizeInMb < 1, 'Compressed bundle is less than 1MB');
    t.log({
      bundleId: bundle.split('cache/')[1].split('.json')[0],
      compressedSize: `${sizeInMb} MB`,
    });
  }
});

test('test compressed bundle generated with bundle-source', async t => {
  const bundle =
    '/Users/jorgelopes/Documents/GitHub/Agoric/sow6/liquidation-visibility/agoric-sdk-liquidation-visibility/packages/inter-protocol/test/liquidationVisibility/bundles/bundle-vaultFactory.json';

  // bundle full size
  const jsonString = await fs.readFile(bundle, 'utf8');
  t.assert(jsonString);

  const fileSizeInBytes = Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);

  // @ts-ignore
  const buffer = await t.context.compressFile(bundle);
  t.assert(buffer);
  const sizeInMb = buffer.length / (1024 * 1024);
  t.assert(sizeInMb < 1, 'Compressed bundle is less than 1MB');

  t.log({
    bundleId: bundle.split('bundles/')[1].split('.json')[0],
    fullSize: `${fileSizeInBytes} MB`,
    compressedSize: `${sizeInMb} MB`,
  });
});
