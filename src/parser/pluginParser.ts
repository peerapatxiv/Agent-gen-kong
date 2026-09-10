import type { PluginDefinition } from '@/types/route'
import { parseIntList } from '@/utils/normalization'
import { parseScopeList } from './scopeParser'

export const KNOWN_PLUGINS = [
  'ValidateToken',
  'ValidateTokenIfApiAuth',
  'TokenRevocation',
  'CheckUserStatus',
  'GenerateAndStoreToken',
  'GenerateAndStoreTokenBySession',
] as const

export type KnownPlugin = (typeof KNOWN_PLUGINS)[number]

export function normalizePluginName(raw: string): string {
  const trimmed = raw.trim()
  const found = KNOWN_PLUGINS.find((p) => p.toLowerCase() === trimmed.toLowerCase())
  return found ?? trimmed
}

export type FieldKind =
  | 'requiredScope'
  | 'generateScope'
  | 'plugin'
  | 'method'
  | 'domain'
  | 'description'
  | 'statusCode'
  | 'statusCodes'
  | 'tags'

export interface FieldEntry {
  kind: FieldKind
  value: string
}

/** Classify a "Key: value" style field-name into a known FieldKind, or null if unrecognized. */
export function classifyFieldKeyword(raw: string): FieldKind | null {
  const key = raw.trim().toLowerCase()
  switch (key) {
    case 'required scope':
    case 'required scopes':
      return 'requiredScope'
    case 'scope':
    case 'scopes':
      return 'requiredScope'
    case 'generate scope':
    case 'generate scopes':
      return 'generateScope'
    case 'plugin':
    case 'plugins':
      return 'plugin'
    case 'method':
    case 'methods':
      return 'method'
    case 'domain':
      return 'domain'
    case 'description':
      return 'description'
    case 'status code':
      return 'statusCode'
    case 'status codes':
      return 'statusCodes'
    case 'tag':
    case 'tags':
      return 'tags'
    default:
      return null
  }
}

/**
 * Build a plugin's typed config from the field entries that followed its `Plugin:` line
 * in the ticket, falling back to the route-level required scope for scope-gated plugins
 * that don't declare their own scope field.
 */
export function buildPluginConfig(
  rawName: string,
  segmentFields: FieldEntry[],
  routeScopesFallback: string[],
): PluginDefinition {
  const name = normalizePluginName(rawName)
  const getField = (kind: FieldKind) => segmentFields.find((f) => f.kind === kind)?.value

  switch (name as KnownPlugin) {
    case 'ValidateToken':
    case 'ValidateTokenIfApiAuth': {
      const scopeVal = getField('requiredScope')
      const scopes = scopeVal !== undefined ? parseScopeList(scopeVal) : routeScopesFallback
      return scopes.length ? { name, enabled: true, config: { scopes } } : { name, enabled: true }
    }
    case 'TokenRevocation':
    case 'CheckUserStatus':
      return { name, enabled: true }
    case 'GenerateAndStoreToken': {
      const scopeVal = getField('generateScope') ?? getField('requiredScope')
      const scopes = scopeVal !== undefined ? parseScopeList(scopeVal) : []
      const statusRaw = getField('statusCodes') ?? getField('statusCode')
      const statusCodes = statusRaw ? parseIntList(statusRaw) : []
      const config: Record<string, unknown> = {}
      if (statusCodes.length) config.status_codes = statusCodes
      if (scopes.length) config.scopes = scopes
      return Object.keys(config).length ? { name, enabled: true, config } : { name, enabled: true }
    }
    case 'GenerateAndStoreTokenBySession': {
      const scopeVal = getField('generateScope') ?? getField('requiredScope')
      const scopes = scopeVal !== undefined ? parseScopeList(scopeVal) : []
      const statusRaw = getField('statusCode') ?? getField('statusCodes')
      const statusList = statusRaw ? parseIntList(statusRaw) : []
      const config: Record<string, unknown> = {}
      if (statusList.length) config.status_code = statusList[0]
      if (scopes.length) config.scope = scopes[0]
      return Object.keys(config).length ? { name, enabled: true, config } : { name, enabled: true }
    }
    default: {
      const scopeVal = getField('requiredScope') ?? getField('generateScope')
      const scopes = scopeVal !== undefined ? parseScopeList(scopeVal) : []
      return scopes.length ? { name, enabled: true, config: { scopes } } : { name, enabled: true }
    }
  }
}

/** Default plugin used when the ticket specifies a required scope (or none) but no explicit Plugin field. */
export function defaultValidateTokenPlugin(scopes: string[]): PluginDefinition {
  return scopes.length ? { name: 'ValidateToken', enabled: true, config: { scopes } } : { name: 'ValidateToken', enabled: true }
}
