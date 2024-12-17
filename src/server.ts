import { Server } from "./services/server.ts";

const server = new Server();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  Deno.exit(1);
});
