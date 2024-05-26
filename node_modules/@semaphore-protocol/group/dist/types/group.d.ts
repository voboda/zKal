import { IncrementalMerkleTree, MerkleProof } from "@zk-kit/incremental-merkle-tree";
import { BigNumberish } from "./types";
export default class Group {
    private _id;
    merkleTree: IncrementalMerkleTree;
    /**
     * Initializes the group with the group id and the tree depth.
     * @param id Group identifier.
     * @param treeDepth Tree depth.
     * @param members List of group members.
     */
    constructor(id: BigNumberish, treeDepth?: number, members?: BigNumberish[]);
    /**
     * Returns the id of the group.
     * @returns Group id.
     */
    get id(): BigNumberish;
    /**
     * Returns the root hash of the tree.
     * @returns Root hash.
     */
    get root(): BigNumberish;
    /**
     * Returns the depth of the tree.
     * @returns Tree depth.
     */
    get depth(): number;
    /**
     * Returns the zero value of the tree.
     * @returns Tree zero value.
     */
    get zeroValue(): BigNumberish;
    /**
     * Returns the members (i.e. identity commitments) of the group.
     * @returns List of members.
     */
    get members(): BigNumberish[];
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Group member.
     * @returns Index of the member.
     */
    indexOf(member: BigNumberish): number;
    /**
     * Adds a new member to the group.
     * @param member New member.
     */
    addMember(member: BigNumberish): void;
    /**
     * Adds new members to the group.
     * @param members New members.
     * @deprecated Use the new class parameter to add a list of members.
     */
    addMembers(members: BigNumberish[]): void;
    /**
     * Updates a member in the group.
     * @param index Index of the member to be updated.
     * @param member New member value.
     */
    updateMember(index: number, member: BigNumberish): void;
    /**
     * Removes a member from the group.
     * @param index Index of the member to be removed.
     */
    removeMember(index: number): void;
    /**
     * Creates a proof of membership.
     * @param index Index of the proof's member.
     * @returns Proof object.
     */
    generateMerkleProof(index: number): MerkleProof;
}
