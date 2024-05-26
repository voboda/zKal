import { SemaphoreProof } from "./types";
/**
 * Verifies whether a Semaphore proof is valid. Depending on the depth of the tree used to
 * generate the proof, a different verification key will be used.
 * @param proof The Semaphore proof.
 * @returns True if the proof is valid, false otherwise.
 */
export default function verifyProof(proof: SemaphoreProof): Promise<boolean>;
