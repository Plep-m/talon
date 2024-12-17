import { ClientData } from "./client_data.ts";

export enum PacketType {
  UPDATE_CLIENT_DATA = "UPDATE_CLIENT_DATA",
  ALL_CLIENT_DATA = "ALL_CLIENT_DATA",
  SERVER_MESSAGE = "SERVER_MESSAGE",
  DISABLE_ANCHOR = "DISABLE_ANCHOR",
  REQUEST_SAVE_STATE = "REQUEST_SAVE_STATE",
  PUSH_SAVE_STATE = "PUSH_SAVE_STATE",
  GAME_COMPLETE = "GAME_COMPLETE",
  HEARTBEAT = "HEARTBEAT",
  SET_SCENE_FLAG = "SET_SCENE_FLAG",
  GIVE_ITEM = "GIVE_ITEM",
}

export interface Packet {
  clientId?: number;
  roomId?: string;
  quiet?: boolean;
  targetClientId?: number;
  type: PacketType;
}

export interface UpdateClientDataPacket extends Packet {
  type: PacketType.UPDATE_CLIENT_DATA;
  data: ClientData;
}

export interface AllClientDataPacket extends Packet {
  type: PacketType.ALL_CLIENT_DATA;
  clients: ClientData[];
}

export interface ServerMessagePacket extends Packet {
  type: PacketType.SERVER_MESSAGE;
  message: string;
}

export interface DisableAnchorPacket extends Packet {
  type: PacketType.DISABLE_ANCHOR;
  payload: Record<string | number | symbol, never>;
}

export interface OtherPackets extends Packet {
  type:
    | PacketType.REQUEST_SAVE_STATE
    | PacketType.PUSH_SAVE_STATE
    | PacketType.GAME_COMPLETE
    | PacketType.HEARTBEAT
    | PacketType.SET_SCENE_FLAG
    | PacketType.GIVE_ITEM;
}
