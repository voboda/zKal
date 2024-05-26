import type { BigNumberish } from "ethers";
import { NumericString } from "snarkjs";
/**
 * Creates a keccak256 hash of a message compatible with the SNARK scalar modulus.
 * @param message The message to be hashed.
 * @returns The message digest.
 */
export default function hash(message: BigNumberish): NumericString;
