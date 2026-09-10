/** Known Format-A plugin names with special-cased config shapes. */
export type KnownPluginName =
  | 'ValidateToken'
  | 'ValidateTokenIfApiAuth'
  | 'TokenRevocation'
  | 'CheckUserStatus'
  | 'GenerateAndStoreToken'
  | 'GenerateAndStoreTokenBySession'

export interface PluginDefinition {
  name: KnownPluginName | string
  enabled: boolean
  /** Arbitrary config bag; known plugins get typed helpers in pluginParser/formatA. */
  config?: Record<string, unknown>
}

export type ParseIssueLevel = 'error' | 'warning' | 'info'

export interface ParseIssue {
  level: ParseIssueLevel
  message: string
  /** id of the route this issue applies to, if any */
  routeId?: string
}

export interface RouteDefinition {
  /** Stable client-side id, used for React keys and edits. Not emitted to YAML. */
  id: string
  path: string
  methods: string[]
  scopes: string[]
  domain: string
  version?: string
  plugins: PluginDefinition[]
  description?: string
  tags?: string[]
  external: boolean
  excluded: boolean
  /** Raw ticket text this route was derived from, for the "excluded" inspector and debugging. */
  sourceText?: string
  /** Human label for why a row was excluded (internal service, explicit exclude, etc). */
  exclusionReason?: string
  /** True when the method could not be confidently determined and needs manual review. */
  methodAmbiguous?: boolean
  /** True when the version segment could not be determined. */
  versionMissing?: boolean
  /** True when the path appears to contain a query string that needs manual review. */
  hasQueryString?: boolean
}

export interface ParseResult {
  routes: RouteDefinition[]
  excludedRoutes: RouteDefinition[]
  issues: ParseIssue[]
}
