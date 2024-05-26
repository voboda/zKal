export default class Identity {
    private _trapdoor;
    private _nullifier;
    private _secret;
    private _commitment;
    /**
     * Initializes the class attributes based on the strategy passed as parameter.
     * @param identityOrMessage Additional data needed to create identity for given strategy.
     */
    constructor(identityOrMessage?: string);
    /**
     * Returns the identity trapdoor.
     * @returns The identity trapdoor.
     */
    get trapdoor(): bigint;
    /**
     * Returns the identity trapdoor.
     * @returns The identity trapdoor.
     */
    getTrapdoor(): bigint;
    /**
     * Returns the identity nullifier.
     * @returns The identity nullifier.
     */
    get nullifier(): bigint;
    /**
     * Returns the identity nullifier.
     * @returns The identity nullifier.
     */
    getNullifier(): bigint;
    /**
     * Returns the identity secret.
     * @returns The identity secret.
     */
    get secret(): bigint;
    /**
     * Returns the identity secret.
     * @returns The identity secret.
     */
    getSecret(): bigint;
    /**
     * Returns the identity commitment.
     * @returns The identity commitment.
     */
    get commitment(): bigint;
    /**
     * Returns the identity commitment.
     * @returns The identity commitment.
     */
    getCommitment(): bigint;
    /**
     * Returns a JSON string with trapdoor and nullifier. It can be used
     * to export the identity and reuse it later.
     * @returns The string representation of the identity.
     */
    toString(): string;
}
