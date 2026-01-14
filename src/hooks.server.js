import { validatePODSession } from '$lib/server/podAuth.js';

const cookieName = 'pod_session';
const secret = process.env.SESSION_SECRET || process.env.ZUPASS_SESSION_SECRET || 'dev-secret-change-in-production';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const raw = event.cookies.get(cookieName);
  event.locals.user = null;
  event.locals.tickets = [];

  if (raw) {
    const { valid, session, reason } = await validatePODSession(raw, secret);
    if (valid && session?.user) {
      event.locals.user = session.user;
      event.locals.tickets = session.tickets || [];
    } else {
      console.log('Invalid session:', reason);
    }
  }

  return resolve(event);
}
