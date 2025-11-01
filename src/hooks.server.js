/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const sess = event.cookies.get('zupass_session');
  if (sess) {
    try {
      event.locals.user = JSON.parse(Buffer.from(sess, 'base64url').toString('utf8'));
    } catch {}
  }
  return resolve(event);
}
