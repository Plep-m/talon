import { Client } from "./client.ts";
import { log } from "../utils/logger.ts";
import { Packet } from "./packets.ts";

export class Room {
  public clients: Client[] = [];
  public requestingStateClients: Client[] = [];

  constructor(public id: string, public name: string) {}

  addClient(client: Client) {
    if (!this.clients.includes(client)) {
      this.clients.push(client);
      client.room = this;
      log(`Room ${this.id}`, `Client ${client.id} added.`);
    }
  }

  removeClient(client: Client) {
    this.clients = this.clients.filter((c) => c !== client);
    client.room = undefined;
    log(`Room ${this.id}`, `Client ${client.id} removed.`);
  }

  broadcastPacket(
    packet: Packet,
    sender?: Client,
  ) {
    for (const client of this.clients) {
      if (client !== sender) {
        client.sendPacket(packet);
      }
    }
    log(`Room ${this.id}`, `Packet broadcasted.`);
  }

  isEmpty(): boolean {
    return this.clients.length === 0;
  }
}
