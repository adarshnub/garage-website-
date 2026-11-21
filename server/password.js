import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export const dataDir = resolve(process.env.DATA_DIR || ".data");
export function adminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12)
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    return process.env.ADMIN_PASSWORD;
  }
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = resolve(dataDir, "admin-password.txt");
  try {
    writeFileSync(path, randomBytes(24).toString("base64url"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  return readFileSync(path, "utf8").trim();
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  console.log(adminPassword());
}
