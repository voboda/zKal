import type { BigNumberish } from "ethers";
/**
 * Converts a bignumberish or a text to a bigint.
 * @param value The value to be converted to bigint.
 * @return The value converted to bigint.
 */
export default function toBigInt(value: BigNumberish | Uint8Array | string): bigint;
