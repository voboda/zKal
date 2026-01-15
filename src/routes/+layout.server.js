import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, url, locals }) => {
  const isLogin = url.pathname === '/login';
  const session = cookies.get('pod_session');

  // If not on login page and no session, redirect to login
  if (!isLogin && !session) {
    throw redirect(307, '/login');
  }

  // If on login page and already have session, redirect to home
  if (isLogin && session && locals.user) {
    throw redirect(307, '/');
  }

   return {
    user: locals.user,
    tickets: locals.tickets || []
  };
};
