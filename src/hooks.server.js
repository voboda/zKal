import { cookieName, parseSession } from "$lib/server/session.js";
import { connectToZupass, getState } from "$lib/pod.js";

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const raw = event.cookies.get(cookieName);
  event.locals.user = null;

  // Initialize POD connection if not already connected
  if (!getState().connected) {
    try {
      // This will need an element reference - you might need to adjust this
      // based on your actual implementation
      await connectToZupass();
    } catch (err) {
      console.warn("[pod] failed to connect to Zupass:", err.message);
    }
  }

  if (raw) {
    const { session, reason } = parseSession(
      raw,
      process.env.ZUPASS_SESSION_SECRET,
    );
    if (session?.user) {
      event.locals.user = session.user;
      event.locals.matched = session.matched;
    } else {
      if (reason && reason !== "empty")
        console.warn("[auth] invalid session cookie:", reason);
      event.cookies.delete(cookieName, { path: "/" });
    }
  }
  return resolve(event);
}
