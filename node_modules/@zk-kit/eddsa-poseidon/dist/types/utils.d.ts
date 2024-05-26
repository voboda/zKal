/// <reference types="node" />
import { Point } from "@zk-kit/baby-jubjub";
import type { BigNumberish } from "@zk-kit/utils";
import { Buffer } from "buffer";
import { Signature } from "./types";
/**
 * Prunes a buffer to meet the specific requirements for using it as a private key
 * or part of a signature.
 * @param buff The buffer to be pruned.
 * @returns The pruned buffer.
 */
export declare function pruneBuffer(buff: Buffer): Buffer;
/**
 * Validates if the given object is a valid point on the Baby Jubjub elliptic curve.
 * @param point The point to validate.
 * @returns True if the object is a valid point, false otherwise.
 */
export declare function isPoint(point: Point): boolean;
/**
 * Checks if the provided object conforms to the expected format of a Signature.
 * @param signature The signature to validate.
 * @returns True if the object is a valid Signature, false otherwise.
 */
export declare function isSignature(signature: Signature): boolean;
/**
 * Validates and converts a BigNumberish private key to a Buffer.
 * @param privateKey The private key to check and convert.
 * @returns The private key as a Buffer.
 */
export declare function checkPrivateKey(privateKey: Buffer | Uint8Array | string): Buffer;
/**
 * Validates and converts a BigNumberish message to a bigint.
 * @param message The message to check and convert.
 * @returns The message as a bigint.
 */
export declare function checkMessage(message: BigNumberish): bigint;
/**
 * Computes the Blake512 hash of the input message.
 * Blake512 is a cryptographic hash function that produces a hash value of 512 bits,
 * commonly used for data integrity checks and other cryptographic applications.
 * @param message The input data to hash, provided as a Buffer.
 * @returns A Buffer containing the 512-bit hash result.
 */
export declare function hash(message: Buffer | Uint8Array): Buffer;
