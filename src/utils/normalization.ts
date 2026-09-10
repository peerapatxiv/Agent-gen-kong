export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

const VERSION_RE = /^v\d+$/i

/** Split a path into segments, stripping the leading slash. Empty segments are dropped. */
export function pathSegments(path: string): string[] {
  return path.replace(/^\/+/, '').split('/').filter(Boolean)
}

export interface VersionMatch {
  index: number
  value: string
}

/** Find the first segment that looks like an API version (v1, v2, ...). */
export function findVersionSegment(segments: string[]): VersionMatch | null {
  const index = segments.findIndex((s) => VERSION_RE.test(s))
  if (index === -1) return null
  return { index, value: segments[index] }
}

export interface DomainInfo {
  domain: string
  version?: string
  versionMissing: boolean
}

/** Domain = first meaningful path segment after the version. Falls back to the first segment when no version is present. */
export function extractDomainInfo(path: string): DomainInfo {
  const segments = pathSegments(path)
  const version = findVersionSegment(segments)
  if (version) {
    const domain = segments[version.index + 1] ?? segments[version.index]
    return { domain: (domain ?? '').toLowerCase(), version: version.value.toLowerCase(), versionMissing: false }
  }
  return { domain: (segments[0] ?? '').toLowerCase(), version: undefined, versionMissing: true }
}

/** Parse a comma-separated list of HTTP methods, uppercased and filtered to known verbs. */
export function parseMethods(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is HttpMethod => (HTTP_METHODS as readonly string[]).includes(s))
}

/** Parse a comma/newline/bracket separated list of integers, e.g. "1000", "[1000]", "1000, 1001". */
export function parseIntList(raw: string): number[] {
  return raw
    .split(/[\n,[\]]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
}

let idCounter = 0
export function nextRouteId(): string {
  idCounter += 1
  return `route-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

export function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value.toUpperCase())
}
