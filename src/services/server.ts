import { Client } from "../models/client.ts";
import { Room } from "../models/room.ts";
import { log } from "../utils/logger.ts";
import { PORT } from "../config.ts";
import { handlePacket } from "../handlers/packet_handler.ts";

export class Server {
  private clients: Client[] = [];
  private rooms: Room[] = [];

  async start() {
    log("Server", "Starting on port", PORT);
    const listener = Deno.listen({ port: PORT });
    for await (const conn of listener) {
      this.addClient(conn);
    }
  }

  private addClient(conn: Deno.Conn) {
    const client = new Client(conn.rid, conn, this);
    this.clients.push(client);
    this.listenForClientPackets(client);
  }

  removeClient(client: Client) {
    this.clients = this.clients.filter((c) => c !== client);
  }

  private async listenForClientPackets(client: Client) {
    const buffer = new Uint8Array(1024);
    while (true) {
      try {
        const count = await client.connection.read(buffer);
        if (!count) break;

        handlePacket(client, buffer.subarray(0, count), this);
      } catch (error) {
        log(`Client ${client.id}`, `Read error: ${error.message}`);
        this.removeClient(client);
        break;
      }
    }
  }

  processPacket(client: Client, packet: Uint8Array) {
    log(`Server`, `Processing packet from Client ${client.id}`);
    handlePacket(client, packet, this);
  }

  // Method to get or create a room
  getOrCreateRoom(roomName: string): Room {
    let room = this.rooms.find((r) => r.name === roomName);
    if (!room) {
      room = new Room(Date.now().toString(), roomName);
      this.rooms.push(room);
      log("Server", `Room ${roomName} created`);
    }
    return room;
  }

  // Method to get the room a client is in
  getRoomByClient(client: Client): Room | undefined {
    return this.rooms.find((room) => room.clients.includes(client));
  }

  // Method to get a client by their ID
  getClientById(clientId: number): Client | undefined {
    return this.clients.find((client) => client.id === clientId);
  }
}
