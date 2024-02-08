import { startVaultFactory } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { Stable } from '@agoric/internal/src/tokens.js';

export { startVaultFactory };

const VAULT_FACTORY_MANIFEST = harden({
  [startVaultFactory.name]: {
    consume: {
      board: 'board',
      chainStorage: true,
      diagnostics: true,
      feeMintAccess: 'zoe',
      chainTimerService: 'timer',
      zoe: 'zoe',
      priceAuthority: 'priceAuthority',
      economicCommitteeCreatorFacet: 'economicCommittee',
      reserveKit: 'reserve',
      auctioneerKit: 'auction',
    },
    produce: { vaultFactoryKit: 'VaultFactory' },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
    oracleBrand: { consume: { USD: true } },
    installation: {
      consume: {
        contractGovernor: 'zoe',
        VaultFactory: 'zoe',
      },
    },
    instance: {
      consume: {
        reserve: 'reserve',
        auctioneer: 'auction',
      },
      produce: {
        VaultFactory: 'VaultFactory',
        VaultFactoryGovernor: 'VaultFactoryGovernor',
      },
    },
  },
});

export const getManifestForVaultFactory = (
  { restoreRef },
  { installKeys, vaultFactoryControllerAddress },
) => {
  return {
    manifest: VAULT_FACTORY_MANIFEST,
    installations: {
      VaultFactory: restoreRef(installKeys.vaultFactory),
    },
    options: {
      vaultFactoryControllerAddress,
    },
  };
};
