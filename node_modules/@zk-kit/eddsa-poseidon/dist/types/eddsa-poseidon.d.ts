/// <reference types="node" />
import { Point } from "@zk-kit/baby-jubjub";
import type { BigNumberish } from "@zk-kit/utils";
import { Buffer } from "buffer";
import { Signature } from "./types";
/**
 * Derives a secret scalar from a given EdDSA private key.
 *
 * This process involves hashing the private key with Blake1, pruning the resulting hash to retain the lower 32 bytes,
 * and converting it into a little-endian integer. The use of the secret scalar streamlines the public key generation
 * process by omitting steps 1, 2, and 3 as outlined in RFC 8032 section 5.1.5, enhancing circuit efficiency and simplicity.
 * This method is crucial for fixed-base scalar multiplication operations within the correspondent cryptographic circuit.
 * For detailed steps, see: {@link https://datatracker.ietf.org/doc/html/rfc8032#section-5.1.5}.
 * For example usage in a circuit, see: {@link https://github.com/semaphore-protocol/semaphore/blob/2c144fc9e55b30ad09474aeafa763c4115338409/packages/circuits/semaphore.circom#L21}
 *
 * The private key must be an instance of Buffer, Uint8Array or a string. The input will be used to
 * generate entropy and there is no limit in size.
 * The string is used as a set of raw bytes (in UTF-8) and is typically used to pass passwords or secret messages.
 * If you want to pass a bigint, a number or a hexadecimal, be sure to convert them to one of the supported types first.
 * The 'conversions' module in @zk-kit/utils provides a set of functions that may be useful in case you need to convert types.
 *
 * @param privateKey The EdDSA private key for generating the associated public key.
 * @returns The derived secret scalar to be used to calculate public key and optimized for circuit calculations.
 */
export declare function deriveSecretScalar(privateKey: Buffer | Uint8Array | string): bigint;
/**
 * Derives a public key from a given private key using the
 * {@link https://eips.ethereum.org/EIPS/eip-2494|Baby Jubjub} elliptic curve.
 * This function utilizes the Baby Jubjub elliptic curve for cryptographic operations.
 * The private key should be securely stored and managed, and it should never be exposed
 * or transmitted in an unsecured manner.
 *
 * The private key must be an instance of Buffer, Uint8Array or a string. The input will be used to
 * generate entropy and there is no limit in size.
 * The string is used as a set of raw bytes (in UTF-8) and is typically used to pass passwords or secret messages.
 * If you want to pass a bigint, a number or a hexadecimal, be sure to convert them to one of the supported types first.
 * The 'conversions' module in @zk-kit/utils provides a set of functions that may be useful in case you need to convert types.
 *
 * @param privateKey The private key used for generating the public key.
 * @returns The derived public key.
 */
export declare function derivePublicKey(privateKey: Buffer | Uint8Array | string): Point<bigint>;
/**
 * Signs a message using the provided private key, employing Poseidon hashing and
 * EdDSA with the Baby Jubjub elliptic curve.
 *
 * The private key must be an instance of Buffer, Uint8Array or a string. The input will be used to
 * generate entropy and there is no limit in size.
 * The string is used as a set of raw bytes (in UTF-8) and is typically used to pass passwords or secret messages.
 * If you want to pass a bigint, a number or a hexadecimal, be sure to convert them to one of the supported types first.
 * The 'conversions' module in @zk-kit/utils provides a set of functions that may be useful in case you need to convert types.
 *
 * @param privateKey The private key used to sign the message.
 * @param message The message to be signed.
 * @returns The signature object, containing properties relevant to EdDSA signatures, such as 'R8' and 'S' values.
 */
export declare function signMessage(privateKey: Buffer | Uint8Array | string, message: BigNumberish): Signature<bigint>;
/**
 * Verifies an EdDSA signature using the Baby Jubjub elliptic curve and Poseidon hash function.
 * @param message The original message that was be signed.
 * @param signature The EdDSA signature to be verified.
 * @param publicKey The public key associated with the private key used to sign the message.
 * @returns Returns true if the signature is valid and corresponds to the message and public key, false otherwise.
 */
export declare function verifySignature(message: BigNumberish, signature: Signature, publicKey: Point): boolean;
/**
 * Converts a given public key into a packed (compressed) string format for efficient transmission and storage.
 * This method ensures the public key is valid and within the Baby Jubjub curve before packing.
 * @param publicKey The public key to be packed.
 * @returns A string representation of the packed public key.
 */
export declare function packPublicKey(publicKey: Point): bigint;
/**
 * Unpacks a public key from its packed string representation back to its original point form on the Baby Jubjub curve.
 * This function checks for the validity of the input format before attempting to unpack.
 * @param publicKey The packed public key as a bignumberish.
 * @returns The unpacked public key as a point.
 */
export declare function unpackPublicKey(publicKey: BigNumberish): Point<bigint>;
/**
 * Packs an EdDSA signature into a buffer of 64 bytes for efficient storage.
 * Use {@link unpackSignature} to reverse the process without needing to know
 * the details of the format.
 *
 * The buffer contains the R8 point packed int 32 bytes (via
 * {@link packSignature}) followed by the S scalar.  All encodings are
 * little-endian.
 *
 * @param signature the signature to pack
 * @returns a 64 byte buffer containing the packed signature
 */
export declare function packSignature(signature: Signature): Buffer;
/**
 * Unpacks a signature produced by {@link packSignature}.  See that function
 * for the details of the format.
 *
 * @param packedSignature the 64 byte buffer to unpack
 * @returns a Signature with numbers in string form
 */
export declare function unpackSignature(packedSignature: Buffer): Signature<bigint>;
/**
 * Represents a cryptographic entity capable of signing messages and verifying signatures
 * using the EdDSA scheme with Poseidon hash and the Baby Jubjub elliptic curve.
 */
export declare class EdDSAPoseidon {
    privateKey: Buffer | Uint8Array | string;
    secretScalar: bigint;
    publicKey: Point<bigint>;
    packedPublicKey: bigint;
    /**
     * Initializes a new instance, deriving necessary cryptographic parameters from the provided private key.
     * If the private key is not passed as a parameter, a random 32-byte hexadecimal key is generated.
     *
     * The private key must be an instance of Buffer, Uint8Array or a string. The input will be used to
     * generate entropy and there is no limit in size.
     * The string is used as a set of raw bytes (in UTF-8) and is typically used to pass passwords or secret messages.
     * If you want to pass a bigint, a number or a hexadecimal, be sure to convert them to one of the supported types first.
     * The 'conversions' module in @zk-kit/utils provides a set of functions that may be useful in case you need to convert types.
     *
     * @param privateKey The private key used for signing and public key derivation.
     */
    constructor(privateKey?: Buffer | Uint8Array | string);
    /**
     * Signs a given message using the private key and returns the signature.
     * @param message The message to be signed.
     * @returns The signature of the message.
     */
    signMessage(message: BigNumberish): Signature<bigint>;
    /**
     * Verifies a signature against a message and the public key stored in this instance.
     * @param message The message whose signature is to be verified.
     * @param signature The signature to be verified.
     * @returns True if the signature is valid for the message and public key, false otherwise.
     */
    verifySignature(message: BigNumberish, signature: Signature): boolean;
}
