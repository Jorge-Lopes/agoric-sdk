//@ts-nocheck
import * as _91 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _92 from './applications/interchain_accounts/controller/v1/query.js';
import * as _93 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _94 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _95 from './applications/interchain_accounts/host/v1/host.js';
import * as _96 from './applications/interchain_accounts/host/v1/query.js';
import * as _97 from './applications/interchain_accounts/v1/account.js';
import * as _98 from './applications/interchain_accounts/v1/metadata.js';
import * as _99 from './applications/interchain_accounts/v1/packet.js';
import * as _100 from './applications/transfer/v1/authz.js';
import * as _101 from './applications/transfer/v1/genesis.js';
import * as _102 from './applications/transfer/v1/query.js';
import * as _103 from './applications/transfer/v1/transfer.js';
import * as _104 from './applications/transfer/v1/tx.js';
import * as _105 from './applications/transfer/v2/packet.js';
import * as _106 from './core/channel/v1/channel.js';
import * as _107 from './core/channel/v1/genesis.js';
import * as _108 from './core/channel/v1/query.js';
import * as _109 from './core/channel/v1/tx.js';
import * as _110 from './core/client/v1/client.js';
import * as _111 from './core/client/v1/genesis.js';
import * as _112 from './core/client/v1/query.js';
import * as _113 from './core/client/v1/tx.js';
import * as _114 from './core/commitment/v1/commitment.js';
import * as _115 from './core/connection/v1/connection.js';
import * as _116 from './core/connection/v1/genesis.js';
import * as _117 from './core/connection/v1/query.js';
import * as _118 from './core/connection/v1/tx.js';
import * as _119 from './lightclients/localhost/v1/localhost.js';
import * as _120 from './lightclients/solomachine/v1/solomachine.js';
import * as _121 from './lightclients/solomachine/v2/solomachine.js';
import * as _122 from './lightclients/tendermint/v1/tendermint.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._91,
          ..._92,
          ..._93,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._94,
        };
      }
      export namespace host {
        export const v1 = {
          ..._95,
          ..._96,
        };
      }
      export const v1 = {
        ..._97,
        ..._98,
        ..._99,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._100,
        ..._101,
        ..._102,
        ..._103,
        ..._104,
      };
      export const v2 = {
        ..._105,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._106,
        ..._107,
        ..._108,
        ..._109,
      };
    }
    export namespace client {
      export const v1 = {
        ..._110,
        ..._111,
        ..._112,
        ..._113,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._114,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._115,
        ..._116,
        ..._117,
        ..._118,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._119,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._120,
      };
      export const v2 = {
        ..._121,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._122,
      };
    }
  }
}
