/*
import { authenticate } from "@pcd/zuauth/server";
import { ETHBERLIN04 } from "@pcd/zuauth/configs/ethberlin";

export async function POST(req) {
    try {
      const pcdStr = request.body.pcdStr; // Use your server's request object here
      const pcd = await authenticate(pcdStr, watermark, ETHBERLIN04); // Use the same watermark and config as the client

        // Save the user's email address, create a session, etc.
    } catch (e) {
        // The submitted pcdStr does not meet our requirements
        // Return a HTTP error response
    }
    const pcdStr = request.body.pcdStr; // Use your server's request object here
    const pcd = await authenticate(pcdStr, 12345n, ETHBERLIN04);
}
*/
