/**
 * The following is a sqrt function (i.e. tonelliShanks) with some pre-computed
 * constants and it only works with 'r'.
 * See {@link https://eprint.iacr.org/2012/685.pdf} and
 * {@link https://github.com/iden3/ffjavascript/blob/6f37a93fabddf45100bf221de6a1399599497e5d/src/fsqrt.js#L38}
 * for more.
 * @param n The number for which to calculate the square root.
 * @returns The square root.
 */
export declare function tonelliShanks(n: bigint, order: bigint): bigint | null;
