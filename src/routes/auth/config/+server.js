import { json } from "@sveltejs/kit";
import { getConfig, getPublicEntries } from "$lib/server/zupassConfig.js";

export async function GET() {
  const cfg = await getConfig();
  return json({ entries: getPublicEntries(cfg) });
}
