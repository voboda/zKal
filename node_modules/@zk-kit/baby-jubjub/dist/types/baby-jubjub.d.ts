import F1Field from "@zk-kit/utils/f1-field";
import { Point } from "./types";
/**
 * Constants and curve parameters for BabyJubJub elliptic curve operations.
 * See: {@link https://eips.ethereum.org/EIPS/eip-2494}
 */
export declare const r: bigint;
export declare const Fr: F1Field;
export declare const Base8: Point<bigint>;
export declare const order: bigint;
export declare const subOrder: bigint;
/**
 * Performs point addition on the Baby Jubjub elliptic curve,
 * calculating a third point from two given points.
 * Let P1 = (x1, y1) and P2 = (x2, y2) be two arbitrary points of the curve.
 * Then P1 + P2 = (x3, y3) is calculated in the following way:
 * x3 = (x1*y2 + y1*x2)/(1 + d*x1*x2*y1*y2)
 * y3 = (y1*y2 - a*x1*x2)/(1 - d*x1*x2*y1*y2)
 * @param p1 First point on the curve.
 * @param p2 Second point on the curve.
 * @returns Resultant third point on the curve.
 */
export declare function addPoint(p1: Point<bigint>, p2: Point<bigint>): Point<bigint>;
/**
 * Performs a scalar multiplication by starting from the 'base' point and 'adding'
 * it to itself 'e' times.
 * @param base The base point used as a starting point.
 * @param e A secret number representing the private key.
 * @returns The resulting point representing the public key.
 */
export declare function mulPointEscalar(base: Point<bigint>, e: bigint): Point<bigint>;
/**
 * Determines if a given point lies on the Baby Jubjub elliptic curve by verifying the curve equation.
 * This function checks if the point satisfies the curve equation `ax^2 + y^2 = 1 + dx^2y^2`.
 * @param p The point to check, represented as a pair of bigint values.
 * @returns True if the point is on the curve, otherwise false.
 */
export declare function inCurve(p: Point): boolean;
/**
 * Packs a point on the Baby Jubjub elliptic curve into a bigint.
 * This process involves converting the y-coordinate to a buffer and conditionally modifying the last byte
 * to encode the sign of the x-coordinate, following a specific compact representation format.
 * @param unpackedPoint The point to be packed, consisting of x and y coordinates.
 * @returns The packed representation of the point as a bigint.
 */
export declare function packPoint(unpackedPoint: Point<bigint>): bigint;
/**
 * Unpacks a bigint back into a point on the Baby Jubjub elliptic curve, reversing the packing process.
 * This involves interpreting the bigint as the y-coordinate and extracting the sign of the x-coordinate
 * from the encoded format. The function then calculates the x-coordinate using the curve equation.
 * @param packedPoint The packed point as a bigint.
 * @returns The unpacked point as a pair of bigint values, or null if the point is invalid.
 */
export declare function unpackPoint(packedPoint: bigint): Point<bigint> | null;
