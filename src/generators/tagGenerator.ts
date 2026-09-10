import type { RouteDefinition } from '@/types/route'
import { pathSegments } from '@/utils/normalization'

/**
 * Format A tags. Default is `[domain, version]`. When the route uses plugins beyond a
 * plain `ValidateToken`, and the path has exactly 2 or 3 meaningful segments after the
 * version, use those segments directly (2 segments reversed to [action, domain], 3 kept
 * in path order) since they tend to be more descriptive than the generic default.
 * A manual `tags` override on the route always wins.
 */
export function generateFormatATags(route: RouteDefinition): string[] {
  if (route.tags && route.tags.length) return route.tags

  const segments = pathSegments(route.path)
  const afterVersion = route.version ? segments.slice(1) : segments
  const usesOnlyValidateToken = route.plugins.length === 1 && route.plugins[0].name === 'ValidateToken'

  if (!usesOnlyValidateToken && afterVersion.length === 2) {
    return [afterVersion[1].toLowerCase(), afterVersion[0].toLowerCase()]
  }
  if (!usesOnlyValidateToken && afterVersion.length === 3) {
    return afterVersion.map((s) => s.toLowerCase())
  }

  return route.version ? [route.domain, route.version] : [route.domain]
}

/**
 * Format B tags: fixed prefix + domain + one tag per method + optional scope=... suffix.
 * The `${{ env "DECK_ENV" }}` entry is returned unquoted — the serializer quotes it.
 */
export function generateFormatBTags(route: RouteDefinition): string[] {
  const tags = ['route', '${{ env "DECK_ENV" }}', 'project=scb-fasteasy-cloud', 'kong-ce2', route.domain, ...route.methods]
  if (route.scopes.length) {
    tags.push(`scope=${route.scopes.join(',')}`)
  }
  return tags
}
