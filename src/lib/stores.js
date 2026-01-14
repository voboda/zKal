// src/stores/content.js
import { persisted } from "svelte-persisted-store";

/*
interface ID {
  privateKey: string,
  publicKey: string,
  commitment: string
}
*/

export const id = persisted("id", {});
export const groups = persisted("groups", []);
