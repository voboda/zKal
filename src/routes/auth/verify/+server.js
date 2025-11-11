import { json } from "@sveltejs/kit";
import { getConfig } from "$lib/server/zupassConfig.js";
import {
  entryMatchesPCD,
  extractAttendee,
  extractEventId,
} from "$lib/server/policy/evaluator.js";
import {
  cookieName,
  cookieOptions,
  serializeSession,
} from "$lib/server/session.js";

let EdDSATicketPCDPackage;
try {
  ({ EdDSATicketPCDPackage } = await import("@pcd/eddsa-ticket-pcd"));
} catch (e) {
  // noop; dev-only fallback below
}

async function deserializeAndVerify(serialized) {
  try {
    if (!EdDSATicketPCDPackage)
      throw new Error("EdDSATicketPCDPackage unavailable");
    const pcd = await EdDSATicketPCDPackage.deserialize(serialized);
    const ok = await EdDSATicketPCDPackage.verify(pcd);
    if (!ok) throw new Error("verify=false");
    return pcd;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      try {
        return JSON.parse(Buffer.from(serialized, "base64").toString("utf8"));
      } catch {}
    }
    throw err;
  }
}

export const POST = async ({ request, cookies }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  const serialized = body?.pcd;
  if (!serialized || typeof serialized !== "string") {
    return new Response("Missing pcd", { status: 400 });
  }

  let cfg;
  try {
    cfg = await getConfig();
  } catch (e) {
    console.error("[auth] config error", e);
    return new Response("Server config error", { status: 500 });
  }

  let pcd;
  try {
    pcd = await deserializeAndVerify(serialized);
  } catch (e) {
    console.error("[auth] PCD verification failed:", e);
    return new Response("Invalid or mismatched proof", { status: 401 });
  }

  let matched = null;
  for (const entry of cfg) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await entryMatchesPCD(entry, pcd);
    if (ok) {
      matched = entry;
      break;
    }
  }
  if (!matched)
    return new Response("Invalid or mismatched proof", { status: 401 });

  const attendee = extractAttendee(pcd);
  const eventId = extractEventId(pcd) ?? null;
  const session = {
    user: { attendee },
    matched: { id: matched.id, type: matched.type, event: eventId },
  };

  const secret = process.env.ZUPASS_SESSION_SECRET;
  cookies.set(cookieName, serializeSession(session, secret), cookieOptions());

  return json({ ok: true });
};
