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
import { MsgSend } from '@agoric/cosmic-proto/cosmos/nft/v1beta1/tx.js';


/**
 * ToDo: the denom provided will not consist of only the classId
 * @returns {import('../types.js').NftDenomAmount}
 */
const toNftDenomAmount = nft => ({
  denom: nft.classId,
  value: {
    id: nft.id,
    uri: nft.uri,
    uri_hash: nft.uriHash,
    data: Any.fromPartial(nft.data),
  },
});

/**
 * @param {import('@agoric/zone').Zone} zone
 */
export const prepareNftKit = zone => {
  const makeNftKit = zone.exoClassKit(
    'Nft Account Holder',
    {
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
     */
    (chainAddress, account, icqConnection) => {
      return { chainAddress, account, icqConnection };
    },
    {
      holder: {
        getAddress() {
          return this.state.chainAddress.address;
        },
        /**
         * @param {import('../types.js').NftDenom} denom
         */
        async getBalance(denom) {
          const { chainAddress, icqConnection } = this.state;
          assert.typeof(denom, 'string');

          // ToDo: the denom may have to be deconstructed to extract the classId from the host chain identifier
          const classId = denom;

          const [result] = await E(icqConnection).query([
            toRequestQueryJson(
              QueryNFTsRequest.toProtoMsg({
                classId: classId,
                owner: chainAddress.address,
              }),
            ),
          ]);

          if (!result?.key) throw Fail`Error parsing result ${result}`;
          const { nfts } = QueryNFTsResponse.decode(decodeBase64(result.key));
          if (!nfts) throw Fail`Result lacked balance key: ${result}`;

          return harden(nfts.map(toNftDenomAmount));
        },
        async getBalances() {
          const { chainAddress, icqConnection } = this.state;

          /* Based on the protobuf definition for QueryNFTsRequest,
           * it should be possible to provide only the owner as argument
           * ToDo: verify if this is indeed the case.
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

          return harden(nfts.map(toNftDenomAmount));
        },
        /**
         * @param {import('../types.js').NftDenomAmount} nftAmount
         * @param {string} address
         */
        async send(nftAmount, address) {
          const { account } = this.state;

          // ToDo: the denom may have to be deconstructed to extract the classId from the host chain identifier
          const classId = nftAmount.denom;

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
