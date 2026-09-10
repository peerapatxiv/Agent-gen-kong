import { load } from 'js-yaml'
import type { RouteDefinition } from '@/types/route'

export interface YamlValidationMessage {
  level: 'error' | 'warning'
  message: string
}

export interface YamlValidationResult {
  valid: boolean
  messages: YamlValidationMessage[]
  parsed?: unknown
}

/** Parse YAML text and report a syntax error if it doesn't parse. */
export function checkYamlSyntax(text: string): YamlValidationResult {
  if (!text.trim()) {
    return { valid: true, messages: [] }
  }
  try {
    const parsed = load(text)
    return { valid: true, messages: [], parsed }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, messages: [{ level: 'error', message: `YAML syntax error: ${message}` }] }
  }
}

interface AnyRecord {
  [key: string]: unknown
}

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structural validation for Format A (App-config style) output. */
export function validateFormatAYaml(text: string, routes: RouteDefinition[]): YamlValidationResult {
  const syntax = checkYamlSyntax(text)
  const messages: YamlValidationMessage[] = [...syntax.messages]
  if (!syntax.valid) return { valid: false, messages }

  const parsed = syntax.parsed
  if (routes.length === 0) {
    return { valid: true, messages }
  }
  if (!Array.isArray(parsed)) {
    messages.push({ level: 'error', message: 'Format A YAML root must be a list of routes.' })
    return { valid: false, messages }
  }
  if (parsed.length !== routes.length) {
    messages.push({ level: 'warning', message: `Expected ${routes.length} route(s), found ${parsed.length} in generated YAML.` })
  }

  parsed.forEach((entry, i) => {
    if (!isRecord(entry)) {
      messages.push({ level: 'error', message: `Route #${i + 1} is not a valid object.` })
      return
    }
    if (!entry.name || typeof entry.name !== 'string') {
      messages.push({ level: 'error', message: `Route #${i + 1} is missing a "name".` })
    }
    if (!Array.isArray(entry.paths) || entry.paths.length === 0) {
      messages.push({ level: 'error', message: `Route #${i + 1} is missing "paths".` })
    }
    if (!Array.isArray(entry.methods) || entry.methods.length === 0) {
      messages.push({ level: 'error', message: `Route #${i + 1} is missing "methods".` })
    }
    if (entry.enabled !== true) {
      messages.push({ level: 'error', message: `Route #${i + 1} must have "enabled: true".` })
    }
    if (!Array.isArray(entry.plugins) || entry.plugins.length === 0) {
      messages.push({ level: 'error', message: `Route #${i + 1} is missing "plugins".` })
    } else {
      entry.plugins.forEach((p, pi) => {
        if (!isRecord(p) || typeof p.name !== 'string' || typeof p.enabled !== 'boolean') {
          messages.push({ level: 'error', message: `Route #${i + 1} plugin #${pi + 1} has an invalid shape.` })
        }
      })
    }
  })

  const hasErrors = messages.some((m) => m.level === 'error')
  return { valid: !hasErrors, messages }
}

/** Structural validation for Format B (Kong Deck style) output. */
export function validateFormatBYaml(text: string, routes: RouteDefinition[]): YamlValidationResult {
  const syntax = checkYamlSyntax(text)
  const messages: YamlValidationMessage[] = [...syntax.messages]
  if (!syntax.valid) return { valid: false, messages }

  const parsed = syntax.parsed
  if (routes.length === 0) {
    return { valid: true, messages }
  }
  if (!Array.isArray(parsed)) {
    messages.push({ level: 'error', message: 'Format B YAML root must be a list of routes.' })
    return { valid: false, messages }
  }
  if (parsed.length !== routes.length) {
    messages.push({ level: 'warning', message: `Expected ${routes.length} route(s), found ${parsed.length} in generated YAML.` })
  }

  const expectedHosts = ['fec-gateway-${{ env "DECK_ENV" }}.np.private.azscb.tech', 'localhost']

  parsed.forEach((entry, i) => {
    if (!isRecord(entry)) {
      messages.push({ level: 'error', message: `Route #${i + 1} is not a valid object.` })
      return
    }
    if (typeof entry.name !== 'string' || !entry.name.includes('${{ env "DECK_ENV" }}')) {
      messages.push({ level: 'error', message: `Route #${i + 1} name must include the literal \${{ env "DECK_ENV" }} template.` })
    }
    if (!Array.isArray(entry.paths) || typeof entry.paths[0] !== 'string' || !entry.paths[0].includes('${{ env "DECK_ROUTE_PREFIX" }}')) {
      messages.push({ level: 'error', message: `Route #${i + 1} path must be prefixed with \${{ env "DECK_ROUTE_PREFIX" }}.` })
    }
    if (!Array.isArray(entry.hosts) || JSON.stringify(entry.hosts) !== JSON.stringify(expectedHosts)) {
      messages.push({ level: 'error', message: `Route #${i + 1} must use the exact required "hosts" list.` })
    }
    if (!Array.isArray(entry.tags) || entry.tags.length < 4) {
      messages.push({ level: 'error', message: `Route #${i + 1} is missing "tags".` })
    } else {
      const prefix = ['route', '${{ env "DECK_ENV" }}', 'project=scb-fasteasy-cloud', 'kong-ce2']
      for (let t = 0; t < prefix.length; t++) {
        if (entry.tags[t] !== prefix[t]) {
          messages.push({ level: 'error', message: `Route #${i + 1} tags must start with the fixed route/env/project/kong-ce2 prefix, in order.` })
          break
        }
      }
    }
    if ('enabled' in entry) {
      messages.push({ level: 'error', message: `Route #${i + 1} must not have an "enabled" key in Format B.` })
    }
    if ('plugins' in entry) {
      messages.push({ level: 'error', message: `Route #${i + 1} must not have a "plugins" key in Format B.` })
    }
    const hasScopeTag = Array.isArray(entry.tags) && entry.tags.some((t) => typeof t === 'string' && t.startsWith('scope='))
    const route = routes[i]
    if (route) {
      if (route.scopes.length > 0 && !hasScopeTag) {
        messages.push({ level: 'error', message: `Route #${i + 1} has required scopes but no "scope=" tag.` })
      }
      if (route.scopes.length === 0 && hasScopeTag) {
        messages.push({ level: 'error', message: `Route #${i + 1} has no required scope but a "scope=" tag is present.` })
      }
    }
  })

  const hasErrors = messages.some((m) => m.level === 'error')
  return { valid: !hasErrors, messages }
}
