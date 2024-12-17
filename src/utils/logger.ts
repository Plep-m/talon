export function log(prefix: string, ...data: unknown[]) {
  console.log(`[${prefix}]:`, ...data);
}
