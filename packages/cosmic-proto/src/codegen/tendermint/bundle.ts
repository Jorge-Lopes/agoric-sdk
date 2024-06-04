//@ts-nocheck
import * as _129 from './abci/types.js';
import * as _130 from './crypto/keys.js';
import * as _131 from './crypto/proof.js';
import * as _132 from './libs/bits/types.js';
import * as _133 from './p2p/types.js';
import * as _134 from './types/block.js';
import * as _135 from './types/evidence.js';
import * as _136 from './types/params.js';
import * as _137 from './types/types.js';
import * as _138 from './types/validator.js';
import * as _139 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._129,
  };
  export const crypto = {
    ..._130,
    ..._131,
  };
  export namespace libs {
    export const bits = {
      ..._132,
    };
  }
  export const p2p = {
    ..._133,
  };
  export const types = {
    ..._134,
    ..._135,
    ..._136,
    ..._137,
    ..._138,
  };
  export const version = {
    ..._139,
  };
}
