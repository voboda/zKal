import { json, error } from '@sveltejs/kit';

// If available, use Zupass PCD packages to verify proofs server-side.
// These imports are optional until you install the dependencies.
let EdDSATicketPCDPackage;
try {
  // Dynamically import so build doesn't fail before deps are installed
  ({ EdDSATicketPCDPackage } = await import('@pcd/eddsa-ticket-pcd'));
} catch (e) {
  // noop; we'll fall back to a very weak structural check below
}

export const POST = async ({ request, cookies, url }) => {
  const body = await request.json().catch(() => ({}));
  const { pcd } = body; // expected to be a serialized PCD string
  if (!pcd || typeof pcd !== 'string') {
    throw error(400, 'Missing pcd');
  }

  const requiredEvent = process.env.PUBLIC_ZUPASS_EVENT_SLUG;
  if (!requiredEvent) {
    throw error(500, 'Server misconfigured: PUBLIC_ZUPASS_EVENT_SLUG not set');
  }

  let ok = false;
  let user = undefined;

  if (EdDSATicketPCDPackage) {
    try {
      const deserialized = await EdDSATicketPCDPackage.deserialize(pcd);
      ok = await EdDSATicketPCDPackage.verify(deserialized);
      if (ok) {
        // Extract event/ticket info from the proof claim
        const claim = deserialized?.claim ?? deserialized?.proof?.claim;
        const ticket = claim?.ticket ?? claim;
        const eventId = ticket?.eventId || ticket?.eventID || ticket?.eventSlug;
        if (!eventId || String(eventId) !== String(requiredEvent)) {
          ok = false;
        } else {
          // Derive a minimal session object (avoid storing full PCD)
          user = {
            eventId: String(eventId),
            attendee: ticket?.attendeeEmail || ticket?.holder || 'zupass-user'
          };
        }
      }
    } catch (e) {
      ok = false;
    }
  } else {
    // Fallback: very weak check to unblock local development without deps
    // DO NOT use in production.
    try {
      const parsed = JSON.parse(Buffer.from(pcd, 'base64').toString('utf8'));
      const eventId = parsed?.claim?.ticket?.eventId || parsed?.ticket?.eventId;
      ok = String(eventId) === String(requiredEvent);
      if (ok) {
        user = { eventId: String(eventId), attendee: parsed?.claim?.ticket?.attendeeEmail || 'dev-user' };
      }
    } catch {}
  }

  if (!ok) {
    throw error(401, 'Invalid or mismatched proof');
  }

  // Issue a session cookie; value is a compact JSON string.
  const session = Buffer.from(JSON.stringify(user)).toString('base64url');
  cookies.set('zupass_session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 // 1 day
  });

  return json({ ok: true });
};
