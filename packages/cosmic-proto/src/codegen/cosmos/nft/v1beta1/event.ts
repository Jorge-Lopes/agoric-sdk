//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** EventSend is emitted on Msg/Send */
export interface EventSend {
  classId: string;
  id: string;
  sender: string;
  receiver: string;
}
export interface EventSendProtoMsg {
  typeUrl: '/cosmos.nft.v1beta1.EventSend';
  value: Uint8Array;
}
/** EventSend is emitted on Msg/Send */
export interface EventSendSDKType {
  class_id: string;
  id: string;
  sender: string;
  receiver: string;
}
/** EventMint is emitted on Mint */
export interface EventMint {
  classId: string;
  id: string;
  owner: string;
}
export interface EventMintProtoMsg {
  typeUrl: '/cosmos.nft.v1beta1.EventMint';
  value: Uint8Array;
}
/** EventMint is emitted on Mint */
export interface EventMintSDKType {
  class_id: string;
  id: string;
  owner: string;
}
/** EventBurn is emitted on Burn */
export interface EventBurn {
  classId: string;
  id: string;
  owner: string;
}
export interface EventBurnProtoMsg {
  typeUrl: '/cosmos.nft.v1beta1.EventBurn';
  value: Uint8Array;
}
/** EventBurn is emitted on Burn */
export interface EventBurnSDKType {
  class_id: string;
  id: string;
  owner: string;
}
function createBaseEventSend(): EventSend {
  return {
    classId: '',
    id: '',
    sender: '',
    receiver: '',
  };
}
export const EventSend = {
  typeUrl: '/cosmos.nft.v1beta1.EventSend',
  encode(
    message: EventSend,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.classId !== '') {
      writer.uint32(10).string(message.classId);
    }
    if (message.id !== '') {
      writer.uint32(18).string(message.id);
    }
    if (message.sender !== '') {
      writer.uint32(26).string(message.sender);
    }
    if (message.receiver !== '') {
      writer.uint32(34).string(message.receiver);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventSend {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventSend();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.classId = reader.string();
          break;
        case 2:
          message.id = reader.string();
          break;
        case 3:
          message.sender = reader.string();
          break;
        case 4:
          message.receiver = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventSend {
    return {
      classId: isSet(object.classId) ? String(object.classId) : '',
      id: isSet(object.id) ? String(object.id) : '',
      sender: isSet(object.sender) ? String(object.sender) : '',
      receiver: isSet(object.receiver) ? String(object.receiver) : '',
    };
  },
  toJSON(message: EventSend): JsonSafe<EventSend> {
    const obj: any = {};
    message.classId !== undefined && (obj.classId = message.classId);
    message.id !== undefined && (obj.id = message.id);
    message.sender !== undefined && (obj.sender = message.sender);
    message.receiver !== undefined && (obj.receiver = message.receiver);
    return obj;
  },
  fromPartial(object: Partial<EventSend>): EventSend {
    const message = createBaseEventSend();
    message.classId = object.classId ?? '';
    message.id = object.id ?? '';
    message.sender = object.sender ?? '';
    message.receiver = object.receiver ?? '';
    return message;
  },
  fromProtoMsg(message: EventSendProtoMsg): EventSend {
    return EventSend.decode(message.value);
  },
  toProto(message: EventSend): Uint8Array {
    return EventSend.encode(message).finish();
  },
  toProtoMsg(message: EventSend): EventSendProtoMsg {
    return {
      typeUrl: '/cosmos.nft.v1beta1.EventSend',
      value: EventSend.encode(message).finish(),
    };
  },
};
function createBaseEventMint(): EventMint {
  return {
    classId: '',
    id: '',
    owner: '',
  };
}
export const EventMint = {
  typeUrl: '/cosmos.nft.v1beta1.EventMint',
  encode(
    message: EventMint,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.classId !== '') {
      writer.uint32(10).string(message.classId);
    }
    if (message.id !== '') {
      writer.uint32(18).string(message.id);
    }
    if (message.owner !== '') {
      writer.uint32(26).string(message.owner);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventMint {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventMint();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.classId = reader.string();
          break;
        case 2:
          message.id = reader.string();
          break;
        case 3:
          message.owner = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventMint {
    return {
      classId: isSet(object.classId) ? String(object.classId) : '',
      id: isSet(object.id) ? String(object.id) : '',
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(message: EventMint): JsonSafe<EventMint> {
    const obj: any = {};
    message.classId !== undefined && (obj.classId = message.classId);
    message.id !== undefined && (obj.id = message.id);
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(object: Partial<EventMint>): EventMint {
    const message = createBaseEventMint();
    message.classId = object.classId ?? '';
    message.id = object.id ?? '';
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(message: EventMintProtoMsg): EventMint {
    return EventMint.decode(message.value);
  },
  toProto(message: EventMint): Uint8Array {
    return EventMint.encode(message).finish();
  },
  toProtoMsg(message: EventMint): EventMintProtoMsg {
    return {
      typeUrl: '/cosmos.nft.v1beta1.EventMint',
      value: EventMint.encode(message).finish(),
    };
  },
};
function createBaseEventBurn(): EventBurn {
  return {
    classId: '',
    id: '',
    owner: '',
  };
}
export const EventBurn = {
  typeUrl: '/cosmos.nft.v1beta1.EventBurn',
  encode(
    message: EventBurn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.classId !== '') {
      writer.uint32(10).string(message.classId);
    }
    if (message.id !== '') {
      writer.uint32(18).string(message.id);
    }
    if (message.owner !== '') {
      writer.uint32(26).string(message.owner);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventBurn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.classId = reader.string();
          break;
        case 2:
          message.id = reader.string();
          break;
        case 3:
          message.owner = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventBurn {
    return {
      classId: isSet(object.classId) ? String(object.classId) : '',
      id: isSet(object.id) ? String(object.id) : '',
      owner: isSet(object.owner) ? String(object.owner) : '',
    };
  },
  toJSON(message: EventBurn): JsonSafe<EventBurn> {
    const obj: any = {};
    message.classId !== undefined && (obj.classId = message.classId);
    message.id !== undefined && (obj.id = message.id);
    message.owner !== undefined && (obj.owner = message.owner);
    return obj;
  },
  fromPartial(object: Partial<EventBurn>): EventBurn {
    const message = createBaseEventBurn();
    message.classId = object.classId ?? '';
    message.id = object.id ?? '';
    message.owner = object.owner ?? '';
    return message;
  },
  fromProtoMsg(message: EventBurnProtoMsg): EventBurn {
    return EventBurn.decode(message.value);
  },
  toProto(message: EventBurn): Uint8Array {
    return EventBurn.encode(message).finish();
  },
  toProtoMsg(message: EventBurn): EventBurnProtoMsg {
    return {
      typeUrl: '/cosmos.nft.v1beta1.EventBurn',
      value: EventBurn.encode(message).finish(),
    };
  },
};
