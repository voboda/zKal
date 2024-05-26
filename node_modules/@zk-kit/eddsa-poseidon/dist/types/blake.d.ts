/**
 * Copyright
 * This code is a TypeScript adaptation of the 'blake-hash' library code (https://www.npmjs.com/package/blake-hash)
 * using the 'buffer' npm package (https://www.npmjs.com/package/buffer).
 * The 'js-crypto' library (https://github.com/iden3/js-crypto/blob/main/src/blake.ts) from Iden3 was used as a reference
 * for this work, specifically for types and adaptation.
 */
/// <reference types="node" />
/**
 * @module Blake
 * Implements the Blake-512 cryptographic hash function.
 * Blake-512 is part of the BLAKE family of cryptographic hash functions, known
 * for its speed and security. This module offers functionality to compute Blake-512
 * hashes of input data, providing both one-time hashing capabilities and incremental
 * hashing to process large or streaming data.
 *
 * This code is adapted from the "blake-hash" JavaScript library, ensuring compatibility
 * and performance in TypeScript environments. It supports hashing with optional
 * salt for enhanced security in certain contexts.
 */
import { Buffer } from "buffer";
/**
 * Represents a Blake-512 hash computation instance.
 * This class maintains the internal state, buffers, and counters needed to
 * process input data and produce the final hash output. It supports incremental
 * hashing, allowing data to be added in chunks.
 */
export declare class Blake512 {
    private _h;
    private _s;
    private _block;
    private _blockOffset;
    private _length;
    private _zo;
    private _oo;
    private _nullt;
    /**
     * Initializes a new Blake-512 hash instance with the default parameters.
     */
    constructor();
    /**
     * The core compression function for Blake-512. It transforms the internal
     * state based on the input block and the current hash parameters.
     */
    _compress(): void;
    /**
     * Adds padding to the message as per the Blake-512 specification, ensuring
     * the message length is a multiple of the block size.
     */
    _padding(): void;
    /**
     * Completes the hash computation and returns the final hash value.
     * This method applies the necessary padding, performs the final compression,
     * and returns the hash output.
     * @returns The Blake-512 hash of the input data.
     */
    digest(): Buffer;
    /**
     * Updates the hash with new data. This method can be called multiple
     * times to incrementally add data to the hash computation.
     * @param data The data to add to the hash.
     * @returns This instance, to allow method chaining.
     */
    update(data: Buffer): this;
}
