/**
 * Parse a raw "Required Scope" / "Generate Scope" value into a clean scope list.
 * Supports comma-separated ("oob, prelogin") and line-separated ("oob\nprelogin") values.
 * "-", "none" and empty values mean "no scope" and resolve to an empty array.
 */
export function parseScopeList(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(-+|none)$/i.test(s))
}

export function isEmptyScopeValue(raw: string | undefined | null): boolean {
  return parseScopeList(raw).length === 0
}
