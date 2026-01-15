import { createPODSession, getPODCookieOptions } from '$lib/server/podAuth.js';
import { redirect } from '@sveltejs/kit';

const secret = process.env.SESSION_SECRET || process.env.ZUPASS_SESSION_SECRET || 'dev-secret-change-in-production';

export const actions = {
  default: async ({ cookies, request }) => {
    console.log("[login] Login action triggered");
    try {
      const formData = await request.formData();
      const sessionData = formData.get('sessionData');
      
      console.log("[login] Session data received:", sessionData ? "present" : "missing");
      
      if (!sessionData) {
        console.log("[login] No session data provided");
        return { success: false, error: 'No session data provided' };
      }
      
      let session;
      try {
        session = JSON.parse(sessionData);
        console.log("[login] Session parsed successfully, user:", session.user?.publicKey?.slice(0, 10) + "...");
      } catch (e) {
        console.log("[login] Failed to parse session data:", e.message);
        return { success: false, error: 'Invalid session data' };
      }
      
      // Create session cookie
      const sessionCookie = await createPODSession(session, secret);
      const cookieOptions = getPODCookieOptions();
      
      console.log("[login] Setting session cookie, length:", sessionCookie.length);
      cookies.set('pod_session', sessionCookie, cookieOptions);
      
      console.log("[login] Login successful, redirecting to home");
      throw redirect(303, '/');
    } catch (error) {
      console.error('[login] Login error:', error);
      return { success: false, error: error.message };
    }
  },
};
