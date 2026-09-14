/**
 * Host context values are typed `string | null` by the contract, but any of
 * them can arrive as another type (a BSE scrip code arrives as a number, for
 * example). Coerce once, where the value is read from useHostContext, before
 * calling any string method on it.
 */
export function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return null;
}
