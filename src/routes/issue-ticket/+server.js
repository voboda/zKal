import { createTicketPOD } from '$lib/pod.js';
import { json } from '@sveltejs/kit';
import { PRIVATE_ISSUER_PRIVATE_KEY } from '$env/static/private';

export async function POST({ request }) {
    try {
        const body = await request.json();
        console.log('Received ticket request:', body);

        // Validate required fields
        const required = ['eventName', 'eventId', 'attendeePublicKey'];
        for (const field of required) {
            if (!body[field]) {
                return json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        // Use issuer private key from environment variable
        const issuerPrivateKey = PRIVATE_ISSUER_PRIVATE_KEY;
        if (!issuerPrivateKey) {
            console.error('PRIVATE_ISSUER_PRIVATE_KEY environment variable is not set');
            return json({ error: 'Server configuration error' }, { status: 500 });
        }

      console.log('PRIVATE_ISSUER_PRIVATE_KEY', PRIVATE_ISSUER_PRIVATE_KEY);

        // Create ticket POD using the server-side private key
        // Note: We pass the privateKey as a second parameter
        const result = await createTicketPOD({
            eventName: body.eventName,
            eventId: body.eventId,
            ticketType: body.ticketType || 'general',
            productId: body.productId || 'default',
            eventStartDate: BigInt(body.eventStartDate || Date.now()),
            attendeeName: body.attendeeName || 'Attendee',
            attendeeEmail: body.attendeeEmail || 'zupasstest@voboda.com',
            attendeePublicKey: body.attendeePublicKey,
        }, issuerPrivateKey);

        console.log('Ticket POD created:', {
            ticketId: result.ticketId,
            signature: result.signature
        });

        return json({
            success: true,
            ticketId: result.ticketId,
            signature: result.signature,
            pod: result.pod
        });

    } catch (error) {
        console.error('Error issuing ticket:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
