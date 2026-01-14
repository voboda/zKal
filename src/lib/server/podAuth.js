import { getState, connectToZupass, queryTickets, queryAttendance, queryAttendedEvents } from '$lib/pod.js';
import { serializeSession, parseSession } from './session.js';

const cookieName = 'pod_session';

export async function verifyPODConnection(element) {
    try {
        const userPublicKey = await connectToZupass(element);
        if (!userPublicKey) {
            return { success: false, error: 'Failed to connect to Zupass' };
        }

        // Get user's tickets to verify they have access
        const tickets = await queryTickets([userPublicKey]);
        
        if (tickets.length === 0) {
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

        return {
            success: true,
            session: sessionData,
            userPublicKey
        };
    } catch (error) {
        console.error('POD verification error:', error);
        return { success: false, error: error.message };
    }
}

export async function createPODSession(sessionData, secret) {
    const session = serializeSession(sessionData, secret);
    return session;
}

export async function validatePODSession(rawSession, secret) {
    const { session, reason } = parseSession(rawSession, secret);
    
    if (!session) {
        return { valid: false, reason };
    }

    // Check if session is still valid (e.g., not expired)
    // We could add expiration logic here
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (session.connectedAt && Date.now() - session.connectedAt > maxAge) {
        return { valid: false, reason: 'session-expired' };
    }

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
