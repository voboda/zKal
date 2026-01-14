import crypto from "node:crypto";

export const cookieName = "zupass_session";

export function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  };
}

function b64u(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64u(s) {
  const pad = (4 - (s.length % 4)) % 4;
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad),
    "base64",
  ).toString();
}

function sign(payload, secret) {
  return b64u(crypto.createHmac("sha256", secret).update(payload).digest());
}

export function serializeSession(session, secret) {
  const payload = b64u(JSON.stringify(session));
  if (!secret) {
    if (process.env.NODE_ENV !== "production")
      console.warn("[auth] unsigned session");
    return payload;
  }
  return `${payload}.${sign(payload, secret)}`;
}

export function parseSession(raw, secret) {
  try {
    if (!raw) return { session: null, reason: "empty" };
    const parts = raw.split(".");
    if (secret) {
      if (parts.length !== 2)
        return { session: null, reason: "missing-signature" };
      const [p, sig] = parts;
      const exp = sign(p, secret);
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) {
        return { session: null, reason: "bad-signature" };
      }
      return { session: JSON.parse(unb64u(p)) };
    }
    return { session: JSON.parse(unb64u(parts[0])) };
  } catch {
    return { session: null, reason: "parse-error" };
  }
}
