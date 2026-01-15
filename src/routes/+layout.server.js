import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, url, locals }) => {
  const isLogin = url.pathname === '/login';
  const session = cookies.get('pod_session');
  
  console.log("[layout] Page load:", { 
    pathname: url.pathname, 
    isLogin, 
    hasSession: !!session,
    hasUserInLocals: !!locals.user,
    userPublicKey: locals.user?.publicKey?.slice(0, 10) + "..." || "null"
  });
  
  // If not on login page and no session, redirect to login
  if (!isLogin && !session) {
    console.log("[layout] Redirecting to login: no session");
    throw redirect(307, '/login');
  }
  
  // If on login page and already have session, redirect to home
  if (isLogin && session && locals.user) {
    console.log("[layout] Redirecting to home: already logged in");
    throw redirect(307, '/');
  }
  
  console.log("[layout] Proceeding with page load");
  return {
    user: locals.user,
    tickets: locals.tickets || []
  };
};
