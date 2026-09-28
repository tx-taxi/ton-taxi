/** Enough verified neighbors to fill either half of the native block strip. */
export function nativeContextDepth(width: number): number {
  return Math.min(7, Math.max(2, Math.ceil(width / (2 * 155)) + 1));
}
