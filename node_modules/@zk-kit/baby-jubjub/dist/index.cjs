/**
 * @module @zk-kit/baby-jubjub
 * @version 1.0.1
 * @file A JavaScript library for adding points to the curve.
 * @copyright Ethereum Foundation 2024
 * @license MIT
 * @see [Github]{@link https://github.com/privacy-scaling-explorations/zk-kit/tree/main/packages/baby-jubjub}
*/
'use strict';

var conversions = require('@zk-kit/utils/conversions');
var F1Field = require('@zk-kit/utils/f1-field');
var scalar = require('@zk-kit/utils/scalar');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var scalar__namespace = /*#__PURE__*/_interopNamespaceDefault(scalar);

/**
 * The following is a sqrt function (i.e. tonelliShanks) with some pre-computed
 * constants and it only works with 'r'.
 * See {@link https://eprint.iacr.org/2012/685.pdf} and
 * {@link https://github.com/iden3/ffjavascript/blob/6f37a93fabddf45100bf221de6a1399599497e5d/src/fsqrt.js#L38}
 * for more.
 * @param n The number for which to calculate the square root.
 * @returns The square root.
 */
// eslint-disable-next-line import/prefer-default-export
function tonelliShanks(n, order) {
    const Fr = new F1Field(order);
    const sqrt_s = 28;
    const sqrt_z = BigInt("5978345932401256595026418116861078668372907927053715034645334559810731495452");
    const sqrt_tm1d2 = BigInt("40770029410420498293352137776570907027550720424234931066070132305055");
    if (Fr.isZero(n))
        return Fr.zero;
    let w = Fr.pow(n, sqrt_tm1d2);
    const a0 = Fr.pow(Fr.mul(Fr.square(w), n), BigInt(2 ** (sqrt_s - 1)));
    if (Fr.eq(a0, Fr._negone)) {
        return null;
    }
    let v = sqrt_s;
    let x = Fr.mul(n, w);
    let b = Fr.mul(x, w);
    let z = sqrt_z;
    while (!Fr.eq(b, Fr.one)) {
        let b2k = Fr.square(b);
        let k = 1;
        while (!Fr.eq(b2k, Fr.one)) {
            b2k = Fr.square(b2k);
            k += 1;
        }
        w = z;
        for (let i = 0; i < v - k - 1; i += 1) {
            w = Fr.square(w);
        }
        z = Fr.square(w);
        b = Fr.mul(b, z);
        x = Fr.mul(x, w);
        v = k;
    }
    return Fr.geq(x, Fr.zero) ? x : Fr.neg(x);
}

/**
 * Constants and curve parameters for BabyJubJub elliptic curve operations.
 * See: {@link https://eips.ethereum.org/EIPS/eip-2494}
 */
// Prime order of the alt_bn128 curve.
const r = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// Prime finite field 'F' with r elements (F_r).
const Fr = new F1Field(r);
// Base point for generating other points on the Baby Jubjub curve.
const Base8 = [
    Fr.e(BigInt("5299619240641551281634865583518297030282874472190772894086521144482721001553")),
    Fr.e(BigInt("16950150798460657717958625567821834550301663161624707787222815936182638968203"))
];
// Curve parameters from the equation 'ax^2 + y^2 = 1 + dx^2y^2',
// representing a Twisted Edwards Elliptic Curve E defined over 'F_r'.
const a = Fr.e(BigInt("168700"));
const d = Fr.e(BigInt("168696"));
// The Baby JubJub curve 'E(F_r)' is equal to the subgroup of 'F_r'-rational points of 'E'.
const order = BigInt("21888242871839275222246405745257275088614511777268538073601725287587578984328");
const subOrder = scalar__namespace.shiftRight(order, BigInt(3));
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
function addPoint(p1, p2) {
    // beta = x1*y2
    const beta = Fr.mul(p1[0], p2[1]);
    // gamma = y1*x2
    const gamma = Fr.mul(p1[1], p2[0]);
    // delta = (y1-(a*x1))*(x2+y2)
    const delta = Fr.mul(Fr.sub(p1[1], Fr.mul(a, p1[0])), Fr.add(p2[0], p2[1]));
    // x1*x2*y1*y2
    const tau = Fr.mul(beta, gamma);
    // d*x1*x2*y1*y2
    const dtau = Fr.mul(d, tau);
    // x3 = (x1*y2 + y1*x2)/(1 + d*x1*x2*y1*y2)
    const p3x = Fr.div(Fr.add(beta, gamma), Fr.add(Fr.one, dtau));
    // y3 = (y1*y2 - a*x1*x2)/(1 - d*x1*x2*y1*y2)
    const p3y = Fr.div(Fr.add(delta, Fr.sub(Fr.mul(a, beta), gamma)), Fr.sub(Fr.one, dtau));
    return [p3x, p3y];
}
/**
 * Performs a scalar multiplication by starting from the 'base' point and 'adding'
 * it to itself 'e' times.
 * @param base The base point used as a starting point.
 * @param e A secret number representing the private key.
 * @returns The resulting point representing the public key.
 */
function mulPointEscalar(base, e) {
    let res = [Fr.e(BigInt(0)), Fr.e(BigInt(1))];
    let rem = e;
    let exp = base;
    while (!scalar__namespace.isZero(rem)) {
        if (scalar__namespace.isOdd(rem)) {
            res = addPoint(res, exp);
        }
        exp = addPoint(exp, exp);
        rem = scalar__namespace.shiftRight(rem, BigInt(1));
    }
    return res;
}
/**
 * Determines if a given point lies on the Baby Jubjub elliptic curve by verifying the curve equation.
 * This function checks if the point satisfies the curve equation `ax^2 + y^2 = 1 + dx^2y^2`.
 * @param p The point to check, represented as a pair of bigint values.
 * @returns True if the point is on the curve, otherwise false.
 */
function inCurve(p) {
    const x1 = BigInt(p[0]);
    const y1 = BigInt(p[1]);
    const x2 = Fr.square(x1);
    const y2 = Fr.square(y1);
    return Fr.eq(Fr.add(Fr.mul(a, x2), y2), Fr.add(Fr.one, Fr.mul(Fr.mul(x2, y2), d)));
}
/**
 * Packs a point on the Baby Jubjub elliptic curve into a bigint.
 * This process involves converting the y-coordinate to a buffer and conditionally modifying the last byte
 * to encode the sign of the x-coordinate, following a specific compact representation format.
 * @param unpackedPoint The point to be packed, consisting of x and y coordinates.
 * @returns The packed representation of the point as a bigint.
 */
function packPoint(unpackedPoint) {
    const buffer = conversions.leBigIntToBuffer(unpackedPoint[1], 32);
    if (Fr.lt(unpackedPoint[0], Fr.zero)) {
        buffer[31] |= 0x80;
    }
    return conversions.leBufferToBigInt(buffer);
}
/**
 * Unpacks a bigint back into a point on the Baby Jubjub elliptic curve, reversing the packing process.
 * This involves interpreting the bigint as the y-coordinate and extracting the sign of the x-coordinate
 * from the encoded format. The function then calculates the x-coordinate using the curve equation.
 * @param packedPoint The packed point as a bigint.
 * @returns The unpacked point as a pair of bigint values, or null if the point is invalid.
 */
function unpackPoint(packedPoint) {
    const buffer = conversions.leBigIntToBuffer(packedPoint);
    const unpackedPoint = new Array(2);
    let sign = false;
    if (buffer[31] & 0x80) {
        sign = true;
        buffer[31] &= 0x7f;
    }
    unpackedPoint[1] = conversions.leBufferToBigInt(buffer);
    if (scalar__namespace.gt(unpackedPoint[1], r)) {
        return null;
    }
    const y2 = Fr.square(unpackedPoint[1]);
    let x = tonelliShanks(Fr.div(Fr.sub(Fr.one, y2), Fr.sub(a, Fr.mul(d, y2))), r);
    if (x == null) {
        return null;
    }
    if (sign) {
        x = Fr.neg(x);
    }
    unpackedPoint[0] = x;
    return unpackedPoint;
}

exports.Base8 = Base8;
exports.Fr = Fr;
exports.addPoint = addPoint;
exports.inCurve = inCurve;
exports.mulPointEscalar = mulPointEscalar;
exports.order = order;
exports.packPoint = packPoint;
exports.r = r;
exports.subOrder = subOrder;
exports.unpackPoint = unpackPoint;
