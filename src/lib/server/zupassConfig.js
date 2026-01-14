import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(here, "zupass.json");
let cached = null;

function validateEntry(e, i) {
  if (!e || typeof e !== "object")
    throw new Error(`config[${i}] must be an object`);
  if (!e.id || !e.label || e.type !== "eddsa-ticket-pcd") {
    throw new Error(`config[${i}] missing id/label or unsupported type`);
  }
  if (e.zuauthPolicy && typeof e.zuauthPolicy !== "object") {
    throw new Error(`config[${i}].zuauthPolicy must be an object`);
  }
  if (e.match && typeof e.match !== "object") {
    throw new Error(`config[${i}].match must be an object`);
  }
}

function validateConfig(json) {
  if (!Array.isArray(json)) throw new Error("zupass.json must be an array");
  json.forEach(validateEntry);
  return json;
}

export async function getConfig() {
  if (cached) return cached;
  const raw = await readFile(CONFIG_PATH, "utf-8");
  cached = validateConfig(JSON.parse(raw));
  return cached;
}

export function getPublicEntries(cfg) {
  return (cfg ?? []).map((e) => ({ id: e.id, label: e.label }));
}
