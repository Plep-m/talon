export const PORT = Deno.env.get("PORT")
  ? parseInt(Deno.env.get("PORT")!, 10)
  : 43385;
export const QUIET_MODE = !!Deno.env.get("QUIET");
