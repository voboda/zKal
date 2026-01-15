import { getState, connectToZupass, queryTickets, queryAttendance, queryAttendedEvents } from '$lib/pod.js';
import { serializeSession, parseSession } from './session.js';

const cookieName = 'pod_session';

export async function verifyPODConnection(element) {
    console.log("[podAuth] Starting Zupass connection verification");
    try {
        const userPublicKey = await connectToZupass(element);
        console.log("[podAuth] Zupass connection result:", userPublicKey ? `connected (${userPublicKey.slice(0, 10)}...)` : "failed");
        
        if (!userPublicKey) {
            return { success: false, error: 'Failed to connect to Zupass' };
        }

        // Get user's tickets to verify they have access
        const tickets = await queryTickets([userPublicKey]);
        console.log("[podAuth] Found tickets:", tickets.length);
        
        if (tickets.length === 0) {
            console.log("[podAuth] No tickets found for user");
            return { success: false, error: 'No tickets found for this account' };
        }

        // Create session data
        const sessionData = {
            user: {
                publicKey: userPublicKey,
                email: 'pod-user@example.com', // We'll need to get this from POD data
                name: 'POD User'
            },
            tickets: tickets.map(ticket => ({
                id: ticket.entries?.ticket_id?.value || 'unknown',
                eventId: ticket.entries?.event_id?.value || 'unknown',
                eventName: ticket.entries?.event_name?.value || 'Unknown Event'
            })),
            connectedAt: Date.now()
        };

        console.log("[podAuth] Session data created for user:", userPublicKey.slice(0, 10) + "...");
        return {
            success: true,
            session: sessionData,
            userPublicKey
        };
    } catch (error) {
        console.error('[podAuth] POD verification error:', error);
        return { success: false, error: error.message };
    }
}

export async function createPODSession(sessionData, secret) {
    const session = serializeSession(sessionData, secret);
    return session;
}

export async function validatePODSession(rawSession, secret) {
    console.log("[podAuth] Validating session, raw length:", rawSession?.length || 0);
    const { session, reason } = parseSession(rawSession, secret);
    
    if (!session) {
        console.log("[podAuth] Session invalid, reason:", reason);
        return { valid: false, reason };
    }

    // Check if session is still valid (e.g., not expired)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (session.connectedAt && Date.now() - session.connectedAt > maxAge) {
        console.log("[podAuth] Session expired");
        return { valid: false, reason: 'session-expired' };
    }

    console.log("[podAuth] Session valid, user:", session.user?.publicKey?.slice(0, 10) + "...");
    return { valid: true, session };
}

export function getPODCookieOptions() {
    return {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 // 24 hours
    };
}
