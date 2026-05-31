import { createHash } from "crypto";

export function hashBody(body: Record<string, any>): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
