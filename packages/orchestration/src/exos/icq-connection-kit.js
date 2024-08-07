/** @file ICQConnection Exo */
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { NonNullish, makeTracer } from '@agoric/internal';
import { makeQueryPacket, parseQueryPacket } from '../utils/packet.js';
import { OutboundConnectionHandlerI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Connection, Port} from '@agoric/network';
 * @import {Remote, VowTools} from '@agoric/vow';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {RequestQuery, ResponseQuery} from '@agoric/cosmic-proto/tendermint/abci/types.js';
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 */

const trace = makeTracer('Orchestration:ICQConnection');

export const ICQMsgShape = M.splitRecord(
  { path: M.string(), data: M.string() },
  { height: M.string(), prove: M.boolean() },
);

export const ICQConnectionI = M.interface('ICQConnection', {
  getLocalAddress: M.call().returns(M.string()),
  getRemoteAddress: M.call().returns(M.string()),
  query: M.call(M.arrayOf(ICQMsgShape)).returns(M.promise()),
});

/**
 * @typedef {{
 *   port: Port;
 *   connection: Remote<Connection> | undefined;
 *   localAddress: LocalIbcAddress | undefined;
 *   remoteAddress: RemoteIbcAddress | undefined;
 * }} ICQConnectionKitState
 */

/**
 * Prepares an ICQ Connection Kit based on the
 * {@link https://github.com/cosmos/ibc-apps/blob/e9b46e4bf0ad0a66cf6bc53b5e5496f6e2b4b02b/modules/async-icq/README.md | `icq/v1` IBC application protocol}.
 *
 * `icq/v1`, also referred to as `async-icq`, is a protocol for asynchronous
 * queries between IBC-enabled chains. It allows a chain to send queries to
 * another chain and receive responses asynchronously.
 *
 * The ICQ connection kit provides the necessary functionality to establish and
 * manage an ICQ connection between two chains. It includes methods for
 * retrieving the local and remote addresses of the connection, as well as
 * sending queries and handling connection events.
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareICQConnectionKit = (zone, { watch, when }) =>
  zone.exoClassKit(
    'ICQConnectionKit',
    {
      connection: ICQConnectionI,
      connectionHandler: OutboundConnectionHandlerI,
      parseQueryPacketWatcher: M.interface('ParseQueryPacketWatcher', {
        onFulfilled: M.call(M.string())
          .optional(M.arrayOf(M.undefined())) // does not need watcherContext
          .returns(M.arrayOf(M.record())),
      }),
    },
    /** @param {Port} port */
    port =>
      /** @type {ICQConnectionKitState} */ ({
        port,
        connection: undefined,
        remoteAddress: undefined,
        localAddress: undefined,
      }),
    {
      connection: {
        getLocalAddress() {
          return NonNullish(
            this.state.localAddress,
            'local address not available',
          );
        },
        getRemoteAddress() {
          return NonNullish(
            this.state.remoteAddress,
            'remote address not available',
          );
        },
        /**
         * @param {JsonSafe<RequestQuery>[]} msgs
         * @returns {Promise<JsonSafe<ResponseQuery>[]>}
         * @throws {Error} if packet fails to send or an error is returned
         */
        query(msgs) {
          const { connection } = this.state;
          // TODO #9281 do not throw synchronously when returning a promise; return a rejected Vow
          /// see https://github.com/Agoric/agoric-sdk/pull/9454#discussion_r1626898694
          if (!connection) throw Fail`connection not available`;
          return when(
            watch(
              E(connection).send(makeQueryPacket(msgs)),
              this.facets.parseQueryPacketWatcher,
            ),
          );
        },
      },
      parseQueryPacketWatcher: {
        /** @param {string} ack packet acknowledgement string */
        onFulfilled(ack) {
          return parseQueryPacket(ack);
        },
      },
      connectionHandler: {
        /**
         * @param {Remote<Connection>} connection
         * @param {LocalIbcAddress} localAddr
         * @param {RemoteIbcAddress} remoteAddr
         */
        async onOpen(connection, localAddr, remoteAddr) {
          trace(`ICQ Channel Opened for ${localAddr} at ${remoteAddr}`);
          this.state.connection = connection;
          this.state.remoteAddress = remoteAddr;
          this.state.localAddress = localAddr;
        },
        async onClose(_connection, reason) {
          trace(`ICQ Channel closed. Reason: ${reason}`);
        },
      },
    },
  );

/** @typedef {ReturnType<ReturnType<typeof prepareICQConnectionKit>>} ICQConnectionKit */
/** @typedef {ICQConnectionKit['connection']} ICQConnection */
