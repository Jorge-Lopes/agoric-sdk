// @ts-check
// @jessie-check

import { Far } from '@endo/far';
import {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakMapStore,
  makeScalarBigWeakSetStore,
} from '@agoric/vat-data';

import { makeOnceKit } from './make-once.js';
import { agoricVatDataKeys as keys } from './keys.js';
import { isPassable } from './is-passable.js';

const emptyRecord = harden({});
const initEmpty = harden(() => emptyRecord);

/**
 * This implementation of `defineVirtualExo` only exists to ensure there are no
 * gaps in the virtualZone API.
 *
 * @type {import('.').Zone['exo']}
 */
const makeVirtualExo = (
  label,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const defineKindOptions =
    /** @type {import('@agoric/vat-data').DefineKindOptions<{ self: typeof methods }>} */ (
      options
    );
  const makeInstance = defineVirtualExoClass(
    label,
    interfaceGuard,
    initEmpty,
    methods,
    defineKindOptions,
  );
  return makeInstance();
};

/** @type {import('.').Stores} */
const detachedVirtualStores = Far('virtualStores', {
  detached: () => detachedVirtualStores,
  isStorable: isPassable,
  mapStore: makeScalarBigMapStore,
  setStore: makeScalarBigSetStore,
  weakMapStore: makeScalarBigWeakMapStore,
  weakSetStore: makeScalarBigWeakSetStore,
});

/**
 * A zone that utilizes external storage to reduce the memory footprint of the
 * current vat.
 *
 * @param {string} [baseLabel]
 * @returns {import('.').Zone}
 */
export const makeVirtualZone = (baseLabel = 'virtualZone') => {
  const { makeOnce, wrapProvider } = makeOnceKit(
    baseLabel,
    detachedVirtualStores,
  );

  /**
   * @param {string} label
   * @param {any} _options
   */
  const subZoneProvider = (label, _options) =>
    makeVirtualZone(`${baseLabel}.${label}`);

  return Far('virtualZone', {
    exo: wrapProvider(makeVirtualExo, keys.exo),
    exoClass: wrapProvider(defineVirtualExoClass, keys.exoClass),
    exoClassKit: wrapProvider(defineVirtualExoClassKit, keys.exoClassKit),
    subZone: wrapProvider(subZoneProvider),

    makeOnce,
    detached: detachedVirtualStores.detached,
    isStorable: detachedVirtualStores.isStorable,

    mapStore: wrapProvider(detachedVirtualStores.mapStore),
    setStore: wrapProvider(detachedVirtualStores.setStore),
    weakMapStore: wrapProvider(detachedVirtualStores.weakMapStore),
    weakSetStore: wrapProvider(detachedVirtualStores.weakSetStore),
  });
};
