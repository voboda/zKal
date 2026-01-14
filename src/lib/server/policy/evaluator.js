function b(s) {
  return s ? String(s).trim() : "";
}
function normUpper(s) {
  return b(s).toUpperCase();
}
function normKey(s) {
  return b(s)
    .replace(/^ed25519:/i, "")
    .toLowerCase();
}

export function extractTicket(pcd) {
  return pcd?.claim?.ticket ?? pcd?.claim?.value?.ticket ?? pcd?.ticket ?? null;
}
export function extractEventId(pcd) {
  const t = extractTicket(pcd) || {};
  return t.eventId ?? t.eventID ?? t.eventSlug ?? t.event ?? null;
}
export function extractProductId(pcd) {
  const t = extractTicket(pcd) || {};
  return t.productId ?? t.productID ?? t.ticketType ?? null;
}
export function extractIssuerPublicKey(pcd) {
  const t = extractTicket(pcd) || {};
  const direct =
    pcd?.claim?.signerPublicKey ??
    pcd?.claim?.publicKey ??
    t.signerPublicKey ??
    t.issuerPublicKey;
  return direct ? normKey(direct) : null;
}
export function extractAttendee(pcd) {
  const t = extractTicket(pcd) || {};
  return t.attendeeEmail ?? t.holder ?? "zupass-user";
}

async function evalWithZuauth(policy, pcd) {
  try {
    const mod = await import("@pcd/zuauth");
    const evaluate = mod?.evaluatePolicy ?? mod?.evaluate ?? null;
    if (!evaluate) throw new Error("zuauth evaluate function not found");
    const result = await evaluate(policy, { pcds: [pcd] });
    return !!(result?.allowed ?? result?.ok ?? result === true);
  } catch {
    return null;
  }
}

function evalLocalMatch(match, pcd) {
  if (!match || typeof match !== "object") return false;
  const issuer = extractIssuerPublicKey(pcd);
  const eventId = extractEventId(pcd);
  const productId = extractProductId(pcd);

  if (match.issuerPublicKey?.length) {
    const set = new Set(match.issuerPublicKey.map(normKey));
    if (!issuer || !set.has(normKey(issuer))) return false;
  }
  if (match.event?.length) {
    const set = new Set(match.event.map(normUpper));
    if (!eventId || !set.has(normUpper(eventId))) return false;
  }
  if (match.productId?.length) {
    const set = new Set(match.productId.map(normUpper));
    if (!productId || !set.has(normUpper(productId))) return false;
  }
  return true;
}

export async function entryMatchesPCD(entry, pcd) {
  if (entry?.zuauthPolicy) {
    const ok = await evalWithZuauth(entry.zuauthPolicy, pcd);
    if (ok === true) return true;
    if (ok === false) return false;
  }
  if (entry?.match) {
    return evalLocalMatch(entry.match, pcd);
  }
  return false;
}
