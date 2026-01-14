import { createPODSession, getPODCookieOptions } from '$lib/server/podAuth.js';
import { redirect } from '@sveltejs/kit';

const secret = process.env.SESSION_SECRET || process.env.ZUPASS_SESSION_SECRET || 'dev-secret-change-in-production';

export const actions = {
  default: async ({ cookies, request }) => {
    try {
      const formData = await request.formData();
      const sessionData = formData.get('sessionData');
      
      if (!sessionData) {
        return { success: false, error: 'No session data provided' };
      }
      
      let session;
      try {
        session = JSON.parse(sessionData);
      } catch (e) {
        return { success: false, error: 'Invalid session data' };
      }
      
      // Create session cookie
      const sessionCookie = await createPODSession(session, secret);
      const cookieOptions = getPODCookieOptions();
      
      cookies.set('pod_session', sessionCookie, cookieOptions);
      
      throw redirect(303, '/');
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },
};
