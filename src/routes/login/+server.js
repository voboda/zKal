import { redirect } from '@sveltejs/kit';

export async function POST(req) {
    redirect(307, '/');
}
/*
import { zuAuthPopup } from "@pcd/zuauth";
import { ETHBERLIN04 } from "@pcd/zuauth/configs/ethberlin";

export async function POST(req) {
    const result = await zuAuthPopup({
        fieldsToReveal: {
            revealAttendeeEmail: true,
            revealAttendeeName: true,
            revealEventId: true,
        },
        watermark: 12345n, // can be any arbitrary bigint
        config: ETHBERLIN04 // requests an ETHBerlin ticket
    });
}

// Result should be { type: "pcd", pcdStr: "a long JSON-encoded blob" }
// Send result to server to authenticate
*/
