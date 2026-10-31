import { readFileSync } from "node:fs";

const dir = new URL("../config/", import.meta.url);

export function loadConfig(env = process.env.NODE_ENV ?? "development") {
  try {
    return JSON.parse(readFileSync(new URL(`${env}.json`, dir), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}
