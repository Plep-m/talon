import { Server } from "../services/server.ts";
import { log } from "../utils/logger.ts";
import { ClientData } from "./client_data.ts";
import { Room } from "./room.ts";
import { Packet } from "./packets.ts";

export class Client {
  private remainingData: Uint8Array = new Uint8Array(0);

  constructor(
    public id: number,
    public connection: Deno.Conn,
    public server: Server,
    public data: ClientData = {},
    public room?: Room,
  ) {
    this.initialize();
  }

  private initialize() {
    log(`Client ${this.id}`, "Connected");
    this.listenForData();
  }

  private async listenForData() {
    const buffer = new Uint8Array(1024);
    while (true) {
      try {
        const count = await this.connection.read(buffer);
        if (!count) break;
        this.handleIncomingData(buffer.subarray(0, count));
      } catch (error) {
        log(`Client ${this.id}`, `Read error: ${error.message}`);
        this.disconnect();
        break;
      }
    }
  }

  private handleIncomingData(data: Uint8Array) {
    // Concatenate received data with the existing remaining data
    this.remainingData = this.concatUint8Arrays(data, this.remainingData);

    // Process all complete packets
    while (true) {
      const delimiterIndex = this.findDelimiterIndex(this.remainingData);

      if (delimiterIndex === -1) {
        log(
          `Client ${this.id}`,
          "Incomplete packet, waiting for more data",
          delimiterIndex,
        );
        break;
      }

      // Extract the packet
      const packet = this.remainingData.subarray(0, delimiterIndex);
      this.remainingData = this.remainingData.subarray(delimiterIndex + 1);

      // Handle the extracted packet
      this.handlePacket(packet);
    }
  }

  private concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }

  private findDelimiterIndex(data: Uint8Array): number {
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0 /* null terminator */) {
        return i;
      }
    }
    return -1;
  }

  public handlePacket(packet: Uint8Array) {
    log(`Client ${this.id}`, "Handling packet", packet);

    try {
      const packetString = new TextDecoder().decode(packet);
      const packetObject = JSON.parse(packetString); // Assuming JSON structure
      log(`Client ${this.id}`, "Decoded packet", packetObject);

      this.server.processPacket(this, packet);
    } catch (error) {
      log(`Client ${this.id}`, `Packet handling error: ${error.message}`);
    }
  }

  async sendPacket(
    packetObject: Packet,
  ) {
    try {
      const packetString = JSON.stringify(packetObject);
      const packet = new TextEncoder().encode(packetString + "\0");
      log(
        `Client ${this.id} sent a ${packetObject.type} packet: ${packetString}`,
      );
      if (!this.connection.writable.locked) {
        const writer = this.connection.writable.getWriter();

        // Wait for write to complete, if it takes longer than 30 seconds, disconnect
        await Promise.race([
          await writer.write(packet),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("Timeout, took longer than 30 seconds to send"));
            }, 1000 * 30);
          }),
        ]);

        writer.releaseLock();
      }
    } catch (error) {
      log(`Error sending packet to Client ${this.id}: ${error.message}`);
      this.disconnect();
    }
  }

  disconnect() {
    log(`Client ${this.id}`, "Disconnected");
    this.server.removeClient(this);
  }
}
