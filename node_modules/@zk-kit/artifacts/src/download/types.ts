/**
 * @prop SnarkArtifacts.wasm
 * @prop SnarkArtifacts.zkey
 * @interface
 */
export type SnarkArtifacts = Record<'wasm' | 'zkey', string>

type Digit = `${number}`
type PreRelease = 'alpha' | 'beta'

/**
 * Semantic version.
 * @example
 * 1.0.0-beta
 * 2.0.0
 * @example
 * "latest"
 */
export type Version =
  | `${Digit}.${Digit}.${Digit}`
  | `${Digit}.${Digit}.${Digit}-${PreRelease}`
  | `${Digit}.${Digit}.${Digit}-${PreRelease}.${Digit}`
  | 'latest'
