import { verifyPODConnection, createPODSession, getPODCookieOptions } from '$lib/server/podAuth.js';
import { json } from '@sveltejs/kit';

const secret = process.env.SESSION_SECRET || process.env.ZUPASS_SESSION_SECRET || 'dev-secret-change-in-production';

export const POST = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { elementId } = body;
    
    if (!elementId || typeof elementId !== 'string') {
      return json({ success: false, error: 'Missing elementId' }, { status: 400 });
    }
    
    // In a real implementation, we would need to pass the DOM element
    // However, this needs to be handled client-side
    // For now, we'll simulate verification
    const result = await verifyPODConnection(elementId);
    
    if (!result.success) {
      return json({ success: false, error: result.error }, { status: 401 });
    }
    
    // Create session
    const sessionCookie = await createPODSession(result.session, secret);
    const cookieOptions = getPODCookieOptions();
    
    cookies.set('pod_session', sessionCookie, cookieOptions);
    
    return json({
      success: true,
      user: result.session.user,
      tickets: result.session.tickets
    });
  } catch (error) {
    console.error('POD verification error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
