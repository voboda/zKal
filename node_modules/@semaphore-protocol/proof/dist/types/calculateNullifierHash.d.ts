import { BytesLike, Hexable } from "@ethersproject/bytes";
/**
 * Given the identity nullifier and the external nullifier, it calculates nullifier hash.
 * @param identityNullifier The identity nullifier.
 * @param externalNullifier The external nullifier.
 * @returns The nullifier hash.
 */
export default function calculateNullifierHash(identityNullifier: number | bigint | string, externalNullifier: BytesLike | Hexable | number | bigint): bigint;
