import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { ChainAddressShape, NftShape } from '../typeGuards.js';
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import { Fail } from '@agoric/assert';
import { decodeBase64 } from '@endo/base64';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  QueryNFTsRequest,
  QueryNFTsResponse,
} from '@agoric/cosmic-proto/cosmos/nft/v1beta1/query.js';
import {
  MsgSend,
  MsgSendResponse,
} from '@agoric/cosmic-proto/cosmos/nft/v1beta1/tx.js';

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {ZCF} zcf
 */
export const prepareNftKit = (zone, zcf) => {
  const makeNftKit = zone.exoClassKit(
    'Nft Account Holder',
    {
      helper: M.interface('helper', {
        toNftDenomAmount: M.call(M.string()).returns(M.any()),
      }),
      holder: M.interface('IcaAccountHolder', {
        getPublicTopics: M.call().returns(TopicsRecordShape),
        getAddress: M.call().returns(ChainAddressShape),
        getBalance: M.call(M.string()).returns(NftShape),
        getBalances: M.call().returns(M.arrayOf(NftShape)),
        send: M.call().returns(M.any()),
      }),
    },
    /**
     * @param {import('../types.js').ChainAddress} chainAddress
     * @param {import('../types.js').IcaAccount} account
     * @param {import('../types.js').ICQConnection} icqConnection
     * @param {string} nftDenom
     * @param {StorageNode} storageNode
     */
    (chainAddress, account, icqConnection, nftDenom, storageNode) => {
      return { chainAddress, account, icqConnection, nftDenom };
    },
    {
      helper: {
        toNftDenomAmount(nft) {},
      },
      holder: {
        getAddress() {
          return this.state.chainAddress.address;
        },
        async getBalance(denom) {
          const { toNftDenomAmount } = this.facets.helper;
          const { chainAddress, icqConnection, nftDenom } = this.state;
          denom ||= nftDenom;
          assert.typeof(denom, 'string');

          const [result] = await E(icqConnection).query([
            toRequestQueryJson(
              QueryNFTsRequest.toProtoMsg({
                classId: denom,
                owner: chainAddress.address,
              }),
            ),
          ]);

          if (!result?.key) throw Fail`Error parsing result ${result}`;
          const { nfts } = QueryNFTsResponse.decode(decodeBase64(result.key));
          if (!nfts) throw Fail`Result lacked balance key: ${result}`;

          return harden(toNftDenomAmount(nfts));
        },
        async getBalances() {
          const { toNftDenomAmount } = this.facets.helper;
          const { chainAddress, icqConnection } = this.state;

          /* Based on the protobuf definition for QueryNFTsRequest,
           * it should be possible to provide only the owner as argument
           */
          const [result] = await E(icqConnection).query([
            toRequestQueryJson(
              QueryNFTsRequest.toProtoMsg({
                owner: chainAddress.address,
                classId: '',
              }),
            ),
          ]);

          if (!result?.key) throw Fail`Error parsing result ${result}`;
          const { nfts } = QueryNFTsResponse.decode(decodeBase64(result.key));
          if (!nfts) throw Fail`Result lacked balance key: ${result}`;

          return harden(toNftDenomAmount(nfts));
        },
        async send(nftAmount, address) {
          const { account } = this.state;
          const classId = this.state.nftDenom || nftAmount.brand;

          await E(account).executeEncodedTx([
            Any.toJSON(
              MsgSend.toProtoMsg({
                classId: classId,
                id: nftAmount.value.id,
                sender: this.state.chainAddress.address,
                receiver: address,
              }),
            ),
          ]);
        },
      },
    },
  );
  return harden({ makeNftKit });
};
