/**
 * @module ProofPacking
 *
 * This module provides utility functions to pack and unpack
 * various types of objects, making it easier to export or use
 * them externally.
 */
import type { Groth16Proof } from "snarkjs";
import { PackedGroth16Proof } from "./types";
/**
 * Packs a Snarkjs Groth16 proof into a single list usable as calldata in Solidity (public signals are not included).
 * @param proof The Groth16 proof generated with SnarkJS.
 * @returns Solidity calldata.
 */
export declare function packGroth16Proof(proof: Groth16Proof): PackedGroth16Proof;
/**
 * Unpacks a PackedGroth16Proof Solidity calldata into its original form which is a SnarkJS Groth16 proof.
 * @param proof Solidity calldata.
 * @returns The Groth16 proof compatible with SnarkJS.
 */
export declare function unpackGroth16Proof(proof: PackedGroth16Proof): Groth16Proof;
