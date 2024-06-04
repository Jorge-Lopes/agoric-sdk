//@ts-nocheck
import * as _17 from './auth/v1beta1/auth.js';
import * as _18 from './auth/v1beta1/genesis.js';
import * as _19 from './auth/v1beta1/query.js';
import * as _20 from './authz/v1beta1/authz.js';
import * as _21 from './authz/v1beta1/event.js';
import * as _22 from './authz/v1beta1/genesis.js';
import * as _23 from './authz/v1beta1/query.js';
import * as _24 from './authz/v1beta1/tx.js';
import * as _25 from './bank/v1beta1/authz.js';
import * as _26 from './bank/v1beta1/bank.js';
import * as _27 from './bank/v1beta1/genesis.js';
import * as _28 from './bank/v1beta1/query.js';
import * as _29 from './bank/v1beta1/tx.js';
import * as _30 from './base/abci/v1beta1/abci.js';
import * as _31 from './base/node/v1beta1/query.js';
import * as _32 from './base/query/v1beta1/pagination.js';
import * as _33 from './base/reflection/v2alpha1/reflection.js';
import * as _34 from './base/v1beta1/coin.js';
import * as _35 from './crypto/ed25519/keys.js';
import * as _36 from './crypto/hd/v1/hd.js';
import * as _37 from './crypto/keyring/v1/record.js';
import * as _38 from './crypto/multisig/keys.js';
import * as _39 from './crypto/secp256k1/keys.js';
import * as _40 from './crypto/secp256r1/keys.js';
import * as _41 from './distribution/v1beta1/distribution.js';
import * as _42 from './distribution/v1beta1/genesis.js';
import * as _43 from './distribution/v1beta1/query.js';
import * as _44 from './distribution/v1beta1/tx.js';
import * as _45 from './feegrant/v1beta1/feegrant.js';
import * as _46 from './feegrant/v1beta1/genesis.js';
import * as _47 from './feegrant/v1beta1/query.js';
import * as _48 from './feegrant/v1beta1/tx.js';
import * as _49 from './gov/v1/genesis.js';
import * as _50 from './gov/v1/gov.js';
import * as _51 from './gov/v1/query.js';
import * as _52 from './gov/v1/tx.js';
import * as _53 from './gov/v1beta1/genesis.js';
import * as _54 from './gov/v1beta1/gov.js';
import * as _55 from './gov/v1beta1/query.js';
import * as _56 from './gov/v1beta1/tx.js';
import * as _57 from './group/v1/events.js';
import * as _58 from './group/v1/genesis.js';
import * as _59 from './group/v1/query.js';
import * as _60 from './group/v1/tx.js';
import * as _61 from './group/v1/types.js';
import * as _62 from './mint/v1beta1/genesis.js';
import * as _63 from './mint/v1beta1/mint.js';
import * as _64 from './mint/v1beta1/query.js';
import * as _65 from './nft/v1beta1/event.js';
import * as _66 from './nft/v1beta1/genesis.js';
import * as _67 from './nft/v1beta1/nft.js';
import * as _68 from './nft/v1beta1/query.js';
import * as _69 from './nft/v1beta1/tx.js';
import * as _70 from './params/v1beta1/params.js';
import * as _71 from './params/v1beta1/query.js';
import * as _72 from './staking/v1beta1/authz.js';
import * as _73 from './staking/v1beta1/genesis.js';
import * as _74 from './staking/v1beta1/query.js';
import * as _75 from './staking/v1beta1/staking.js';
import * as _76 from './staking/v1beta1/tx.js';
import * as _77 from './tx/signing/v1beta1/signing.js';
import * as _78 from './tx/v1beta1/service.js';
import * as _79 from './tx/v1beta1/tx.js';
import * as _80 from './upgrade/v1beta1/query.js';
import * as _81 from './upgrade/v1beta1/tx.js';
import * as _82 from './upgrade/v1beta1/upgrade.js';
import * as _83 from './vesting/v1beta1/tx.js';
import * as _84 from './vesting/v1beta1/vesting.js';
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._17,
      ..._18,
      ..._19,
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._20,
      ..._21,
      ..._22,
      ..._23,
      ..._24,
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._25,
      ..._26,
      ..._27,
      ..._28,
      ..._29,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._30,
      };
    }
    export namespace node {
      export const v1beta1 = {
        ..._31,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._32,
      };
    }
    export namespace reflection {
      export const v2alpha1 = {
        ..._33,
      };
    }
    export const v1beta1 = {
      ..._34,
    };
  }
  export namespace crypto {
    export const ed25519 = {
      ..._35,
    };
    export namespace hd {
      export const v1 = {
        ..._36,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._37,
      };
    }
    export const multisig = {
      ..._38,
    };
    export const secp256k1 = {
      ..._39,
    };
    export const secp256r1 = {
      ..._40,
    };
  }
  export namespace distribution {
    export const v1beta1 = {
      ..._41,
      ..._42,
      ..._43,
      ..._44,
    };
  }
  export namespace feegrant {
    export const v1beta1 = {
      ..._45,
      ..._46,
      ..._47,
      ..._48,
    };
  }
  export namespace gov {
    export const v1 = {
      ..._49,
      ..._50,
      ..._51,
      ..._52,
    };
    export const v1beta1 = {
      ..._53,
      ..._54,
      ..._55,
      ..._56,
    };
  }
  export namespace group {
    export const v1 = {
      ..._57,
      ..._58,
      ..._59,
      ..._60,
      ..._61,
    };
  }
  export namespace mint {
    export const v1beta1 = {
      ..._62,
      ..._63,
      ..._64,
    };
  }
  export namespace nft {
    export const v1beta1 = {
      ..._65,
      ..._66,
      ..._67,
      ..._68,
      ..._69,
    };
  }
  export namespace params {
    export const v1beta1 = {
      ..._70,
      ..._71,
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._72,
      ..._73,
      ..._74,
      ..._75,
      ..._76,
    };
  }
  export namespace tx {
    export namespace signing {
      export const v1beta1 = {
        ..._77,
      };
    }
    export const v1beta1 = {
      ..._78,
      ..._79,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._80,
      ..._81,
      ..._82,
    };
  }
  export namespace vesting {
    export const v1beta1 = {
      ..._83,
      ..._84,
    };
  }
}
