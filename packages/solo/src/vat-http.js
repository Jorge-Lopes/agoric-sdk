import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';
import { getReplHandler } from '@agoric/vats/src/repl.js';
import { makePromiseKit } from '@endo/promise-kit';
import { getCapTPHandler } from './captp.js';

// This vat contains the HTTP request handler.
export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  let commandDevice;
  const channelIdToHandle = new Map();
  const channelHandleToId = new WeakMap();
  let LOADING = harden(['agoric', 'wallet', 'local']);
  const { notifier: loadingNotifier, updater: loadingUpdater } =
    makeNotifierKit(LOADING);

  const antifreeze = obj =>
    new Proxy(obj, {
      preventExtensions() {
        return false;
      },
    });

  const lookup = async (...path) => {
    // Take a snapshot of the current home.
    // eslint-disable-next-line no-use-before-define
    const root = replObjects.home;

    if (path.length === 1 && Array.isArray(path[0])) {
      // Convert single array argument to a path.
      path = path[0];
    }
    if (path.length === 0) {
      return root;
    }
    const [first, ...remaining] = path;
    const firstValue = root[first];
    if (remaining.length === 0) {
      return firstValue;
    }
    assert(firstValue, X`${first} not found in home`);
    return E(firstValue).lookup(...remaining);
  };
  harden(lookup);

  const replObjects = {
    home: antifreeze({ LOADING }),
    agoric: antifreeze({}),
    local: antifreeze({}),
    lookup,
  };

  function doneLoading(subsystems) {
    LOADING = LOADING.filter(subsys => !subsystems.includes(subsys));
    loadingUpdater.updateState(LOADING);
    if (LOADING.length) {
      replObjects.home.LOADING = LOADING;
    } else {
      delete replObjects.home.LOADING;
    }
  }

  const send = (obj, channelHandles) => {
    // TODO: Make this sane by adding support for multicast to the commandDevice.
    for (const channelHandle of channelHandles) {
      const channelID = channelHandleToId.get(channelHandle);
      if (channelID) {
        const o = { ...obj, meta: { channelID } };
        D(commandDevice).sendBroadcast(o);
      }
    }
  };

  const sendResponse = (count, isException, obj) =>
    D(commandDevice).sendResponse(
      count,
      isException,
      obj || JSON.parse(JSON.stringify(obj)),
    );

  // Map an URL only to its latest handler.
  const urlToHandler = new Map();

  async function registerURLHandler(handler, url) {
    const fallback = await E(handler)
      .getCommandHandler()
      .catch(_ => undefined);
    const commandHandler = getCapTPHandler(
      send,
      (otherSide, meta, obj) =>
        E(handler)
          .getBootstrap(otherSide, meta, obj)
          .catch(_e => undefined),
      fallback,
    );
    urlToHandler.set(url, commandHandler);
  }

  const { promise: walletP, resolve: resolveWallet } = makePromiseKit();
  const { promise: attMakerP, resolve: resolveAttMaker } = makePromiseKit();
  Promise.all([walletP, attMakerP]).then(async ([wallet, attMaker]) => {
    const walletAdmin = await E(wallet).getAdminFacet();
    // console.debug('introduce', { wallet, walletAdmin, attMaker });
    E(walletAdmin).resolveAttMaker(attMaker);
  });

  return Far('root', {
    setCommandDevice(d) {
      commandDevice = d;

      const replHandler = getReplHandler(replObjects, send, vatPowers);
      registerURLHandler(replHandler, '/private/repl');

      // Assign the captp handler.
      const captpHandler = Far('captpHandler', {
        getBootstrap(_otherSide, _meta) {
          // Harden only our exported objects, and fetch them afresh each time.
          const exported = {
            loadingNotifier,
            ...replObjects.home,
          };
          if (replObjects.agoric) {
            exported.agoric = { ...replObjects.agoric };
          }
          if (replObjects.local) {
            exported.local = { ...replObjects.local };
          }
          return harden(exported);
        },
      });
      registerURLHandler(captpHandler, '/private/captp');
    },

    registerURLHandler,
    registerAPIHandler: h => registerURLHandler(h, '/api'),
    send,
    doneLoading,

    setWallet(wallet) {
      replObjects.local.wallet = wallet;
      replObjects.home.wallet = wallet;

      resolveWallet(wallet);
    },

    /**
     * @param {object} [privateObjects]
     * @param {object} [decentralObjects]
     * @param {object} [deprecatedObjects]
     */
    setPresences(
      privateObjects = undefined,
      decentralObjects = undefined,
      deprecatedObjects = undefined,
    ) {
      // We need to mutate the repl subobjects instead of replacing them.
      if (privateObjects) {
        Object.assign(replObjects.local, privateObjects);
        doneLoading(['local']);
      }

      if (decentralObjects) {
        // Assign the complete decentralObjects to `agoric`.
        Object.assign(replObjects.agoric, decentralObjects);
        doneLoading(['agoric']);

        // Prune out the demo governance stuff from `home`; they're noisy.
        const {
          behaviors: _,
          governanceActions: _2,
          ...rest
        } = decentralObjects;
        decentralObjects = rest;

        if (decentralObjects.attMaker) {
          resolveAttMaker(decentralObjects.attMaker);
        }
      }

      // TODO: Maybe remove sometime; home object is deprecated.
      Object.assign(
        replObjects.home,
        decentralObjects,
        privateObjects,
        deprecatedObjects,
      );
    },

    // devices.command invokes our inbound() because we passed to
    // registerInboundHandler()
    async inbound(count, rawObj) {
      // Launder the data, since the command device tends to pass device nodes
      // when there are empty objects, which screw things up for us.
      // Analysis is in https://github.com/Agoric/agoric-sdk/pull/1956
      const obj = JSON.parse(JSON.stringify(rawObj));
      console.debug(
        `vat-http.inbound (from browser) ${count}`,
        JSON.stringify(obj, undefined, 2),
      );

      const { type, meta: rawMeta = {} } = obj || {};
      const {
        url = '/private/repl',
        channelID: rawChannelID,
        dispatcher = 'onMessage',
      } = rawMeta;

      try {
        let channelHandle = channelIdToHandle.get(rawChannelID);
        if (dispatcher === 'onOpen') {
          channelHandle = Far('channelHandle');
          channelIdToHandle.set(rawChannelID, channelHandle);
          channelHandleToId.set(channelHandle, rawChannelID);
        } else if (dispatcher === 'onClose') {
          channelIdToHandle.delete(rawChannelID);
          channelHandleToId.delete(channelHandle);
        }

        delete obj.meta;

        const meta = {
          ...rawMeta,
          channelHandle,
        };
        delete meta.channelID;

        const urlHandler = urlToHandler.get(url);
        if (urlHandler) {
          const res = await E(urlHandler)[dispatcher](obj, meta);
          if (res) {
            sendResponse(count, false, res);
            return;
          }
        }

        if (dispatcher === 'onMessage') {
          sendResponse(count, false, { type: 'doesNotUnderstand', obj });
          assert.fail(X`No handler for ${url} ${type}`);
        }
        sendResponse(count, false, true);
      } catch (rej) {
        console.debug(`Error ${dispatcher}:`, rej);
        const jsonable = (rej && rej.message) || rej;
        sendResponse(count, true, jsonable);
      }
    },
  });
}
