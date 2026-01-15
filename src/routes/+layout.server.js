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
  
 
  console.log("[layout] Proceeding with page load");
  return {
    user: locals.user,
    tickets: locals.tickets || []
  };
};
