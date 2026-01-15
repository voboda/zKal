import { validatePODSession } from '$lib/server/podAuth.js';

const cookieName = 'pod_session';
const secret = process.env.SESSION_SECRET || process.env.ZUPASS_SESSION_SECRET || 'dev-secret-change-in-production';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const raw = event.cookies.get(cookieName);
  event.locals.user = null;
  event.locals.tickets = [];
  
  console.log("[hooks] Raw session cookie:", raw ? "present" : "missing");
  
  if (raw) {
    const { valid, session, reason } = await validatePODSession(raw, secret);
    console.log("[hooks] Session validation result:", { valid, reason, user: session?.user ? "present" : "null" });
    
    if (valid && session?.user) {
      event.locals.user = session.user;
      event.locals.tickets = session.tickets || [];
      console.log("[hooks] User set in locals:", event.locals.user);
    } else {
      console.log('Invalid session:', reason);
    }
  }

  return resolve(event);
}
