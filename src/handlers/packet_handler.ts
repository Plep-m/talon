import { Client } from "../models/client.ts";
import { Server } from "../services/server.ts";
import {
  AllClientDataPacket,
  OtherPackets,
  Packet,
  PacketType,
  ServerMessagePacket,
  UpdateClientDataPacket,
} from "../models/packets.ts";
import { log } from "../utils/logger.ts";

export function handlePacket(
  client: Client,
  packet: Uint8Array,
  server: Server,
) {
  try {
    const packetString = new TextDecoder().decode(packet);
    const sanitizedPacketString = sanitizePacketString(packetString);

    // Parse the sanitized packet
    const packetObject: Packet = JSON.parse(sanitizedPacketString);

    if (packetObject.roomId && !client.room?.id) {
      server.getOrCreateRoom(packetObject.roomId).addClient(client);
    }

    if (packetObject.targetClientId) {
      const room = client.room;

      const targetClient = room?.clients.find((client) =>
        client.id === packetObject.targetClientId
      );
      if (targetClient) {
        targetClient.sendPacket(packetObject);
      } else {
        log(`Target client ${packetObject.targetClientId} not found`);
      }
      return;
    }
    switch (packetObject.type) {
      case "UPDATE_CLIENT_DATA":
        handleUpdateClientDataPacket(
          client,
          packetObject as UpdateClientDataPacket,
        );
        break;
      case "ALL_CLIENT_DATA":
        handleAllClientDataPacket(
          client,
          packetObject as AllClientDataPacket,
          server,
        );
        break;
      case "DISABLE_ANCHOR":
        handleDisableAnchorPacket(client);
        break;
      case "REQUEST_SAVE_STATE":
      case "PUSH_SAVE_STATE":
      case "GAME_COMPLETE":
      case "SET_SCENE_FLAG":
      case "GIVE_ITEM":
      case "HEARTBEAT":
        handleOtherPackets(client, packetObject as OtherPackets);
        break;
      default:
        log(
          `Client ${client.id}`,
          `Unhandled packet type: ${packetObject.type}`,
        );
        break;
    }
  } catch (error) {
    log(`Client ${client.id}`, `Error handling packet: ${error.message}`);
  }
}

// Handle UPDATE_CLIENT_DATA packet
function handleUpdateClientDataPacket(
  client: Client,
  packet: UpdateClientDataPacket,
) {
  client.data = packet.data;
  log(
    `Client ${client.id}`,
    `Updated client data: ${JSON.stringify(client.data)}`,
  );
}

// Handle ALL_CLIENT_DATA packet
function handleAllClientDataPacket(
  client: Client,
  packet: AllClientDataPacket,
  server: Server,
) {
  const room = server.getRoomByClient(client);
  if (room) {
    room.broadcastPacket(packet, client);
  }
}

// Handle DISABLE_ANCHOR packet
function handleDisableAnchorPacket(
  client: Client,
) {
  log(`Client ${client.id}`, `Anchor disabled`);
}

// Handle REQUEST_SAVE_STATE, PUSH_SAVE_STATE, GAME_COMPLETE, and HEARTBEAT packets
function handleOtherPackets(
  client: Client,
  packet: OtherPackets,
) {
  switch (packet.type) {
    case "REQUEST_SAVE_STATE":
      handleRequestSaveState(client, packet);
      break;
    case "PUSH_SAVE_STATE":
      handlePushSaveState(client, packet);
      break;
    case "GAME_COMPLETE":
      handleGameComplete(client);
      break;
    case "HEARTBEAT":
      handleHeartbeat(client);
      break;
    case "SET_SCENE_FLAG":
      handleSetSceneFlag(client, packet);
      break;
    case "GIVE_ITEM":
      handleGiveItem(client, packet);
      break;
  }
}

function handleRequestSaveState(client: Client, packet: OtherPackets) {
  const room = client.room;
  if (!room || room.clients.length <= 1) {
    const serverMessagePacket: ServerMessagePacket = {
      type: PacketType.SERVER_MESSAGE,
      message: "No other clients available to request save state.",
    };
    client.sendPacket(serverMessagePacket);
  } else {
    room?.requestingStateClients.push(client);
    room?.broadcastPacket(packet, client);

    const serverMessagePacket: ServerMessagePacket = {
      type: PacketType.SERVER_MESSAGE,
      message: "Save State Requested",
    };
    client.sendPacket(serverMessagePacket);
  }
}

function handlePushSaveState(client: Client, packet: OtherPackets) {
  const room = client.room;

  if (room && room.requestingStateClients) {
    const roomStateRequests = room.requestingStateClients;
    roomStateRequests.forEach((client) => {
      client.sendPacket(packet);
    });
    room.requestingStateClients = [];
  }
}

function handleGameComplete(client: Client) {
  log(`Client ${client.id} completed the game`);
}

function handleHeartbeat(client: Client) {
  log(`Client ${client.id} sent heartbeat`);
}

function handleSetSceneFlag(client: Client, packet: OtherPackets) {
  const room = client.room;
  if (room) {
    room.broadcastPacket(packet);
  }
}

function handleGiveItem(client: Client, packet: OtherPackets) {
  const room = client.room;
  if (room) {
    room.broadcastPacket(packet);
  }
}

function sanitizePacketString(packetString: string): string {
  let sanitized = packetString.replace(/[\0]+$/, "");
  sanitized = sanitized.replace(/[^\x20-\x7E\n\r\t]+/g, "");
  return sanitized;
}
