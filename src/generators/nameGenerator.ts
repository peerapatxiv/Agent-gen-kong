import { findVersionSegment, pathSegments } from '@/utils/normalization'

export const DECK_ENV_SUFFIX = '-${{ env "DECK_ENV" }}'
export const DECK_ROUTE_PREFIX = '${{ env "DECK_ROUTE_PREFIX" }}'
export const DECK_HOST_TEMPLATE = 'fec-gateway-${{ env "DECK_ENV" }}.np.private.azscb.tech'

/**
 * Format A name: `<VERSION-uppercase>-<path-segments-joined-by-dash>-routes`.
 * Only the version segment is uppercased; every other segment keeps its original casing.
 */
export function generateFormatAName(path: string): string {
  const segments = pathSegments(path)
  const version = findVersionSegment(segments)
  const mapped = segments.map((seg, i) => (version && i === version.index ? seg.toUpperCase() : seg))
  return `${mapped.join('-')}-routes`
}

/** PascalCase a single path segment: first char uppercase, remainder lowercase. */
export function pascalSegment(segment: string): string {
  if (!segment) return segment
  return segment[0].toUpperCase() + segment.slice(1).toLowerCase()
}

/**
 * Format B name: PascalCase every path segment (no separators), then append
 * the literal `-${{ env "DECK_ENV" }}` suffix.
 */
export function generateFormatBName(path: string): string {
  const segments = pathSegments(path)
  const joined = segments.map(pascalSegment).join('')
  return `${joined}${DECK_ENV_SUFFIX}`
}
