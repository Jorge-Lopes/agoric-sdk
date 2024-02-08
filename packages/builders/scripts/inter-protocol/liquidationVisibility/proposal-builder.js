import { makeHelpers } from '@agoric/deploy-script-support';
import { objectMap } from '@agoric/internal';
import { makeInstallCache } from '@agoric/inter-protocol/src/proposals/utils.js';
import { getManifestForVaultFactory } from './manifest.js';

/** @type {Record<string, Record<string, [string, string]>>} */
const installKeys = {
  vaultFactory: [
    '../../../../inter-protocol/src/vaultFactory/vaultFactory.js',
    './bundles/bundle-vaultFactory.js',
  ],
};

/**
 * @template I
 * @template R
 * @param {object} opts
 * @param {(i: I) => R} opts.publishRef
 * @param {(m: string, b: string, opts?: any) => I} opts.install
 * @param {<T>(f: T) => T} [opts.wrapInstall]
 */
export const vaultFactoryUpdateProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const { VAULT_FACTORY_CONTROLLER_ADDR } = {};

  const install = wrapInstall ? wrapInstall(install0) : install0;

  const persist = true;
  /** @param {Record<string, [string, string]>} group */
  const publishGroup = group =>
    objectMap(group, ([mod, bundle]) =>
      publishRef(install(mod, bundle, { persist })),
    );

  return harden({
    sourceSpec: './manifest.js',
    getManifestCall: [
      getManifestForVaultFactory.name,
      {
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
        installKeys: {
          ...publishGroup(installKeys),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });

  await writeCoreProposal('vaultFactory', opts =>
    vaultFactoryUpdateProposalBuilder({
      ...opts,
      wrapInstall: tool.wrapInstall,
    }),
  );

  await tool.saveCache();
};
