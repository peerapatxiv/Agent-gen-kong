import type { PluginDefinition, RouteDefinition } from '@/types/route'
import { generateFormatAName } from './nameGenerator'
import { generateFormatATags } from './tagGenerator'

/** Double-quote a YAML scalar string, escaping backslashes and quotes. */
function yamlStr(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

function yamlFlowScalar(value: unknown): string {
  if (typeof value === 'string') return yamlStr(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(yamlFlowScalar).join(', ')}]`
  return yamlStr(String(value))
}

const KNOWN_CONFIG_KEY_ORDER = ['status_codes', 'status_code', 'scopes', 'scope']

function serializePluginConfig(config: Record<string, unknown>, indent: string): string[] {
  const lines: string[] = []
  const knownKeys = KNOWN_CONFIG_KEY_ORDER.filter((k) => k in config)
  const otherKeys = Object.keys(config).filter((k) => !KNOWN_CONFIG_KEY_ORDER.includes(k))

  for (const key of [...knownKeys, ...otherKeys]) {
    const value = config[key]
    if (key === 'scopes' && Array.isArray(value)) {
      lines.push(`${indent}scopes:`)
      for (const s of value) lines.push(`${indent}  - ${yamlStr(String(s))}`)
    } else if (key === 'status_codes' && Array.isArray(value)) {
      lines.push(`${indent}status_codes: [${value.join(', ')}]`)
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}: ${yamlFlowScalar(value)}`)
    } else {
      lines.push(`${indent}${key}: ${yamlFlowScalar(value)}`)
    }
  }
  return lines
}

function serializePlugin(plugin: PluginDefinition, indent: string): string[] {
  const lines: string[] = []
  lines.push(`${indent}- name: ${yamlStr(plugin.name)}`)
  lines.push(`${indent}  enabled: ${plugin.enabled}`)
  if (plugin.config && Object.keys(plugin.config).length > 0) {
    lines.push(`${indent}  config:`)
    lines.push(...serializePluginConfig(plugin.config, `${indent}    `))
  }
  return lines
}

function serializeRoute(route: RouteDefinition): string[] {
  const name = generateFormatAName(route.path)
  const tags = generateFormatATags(route)
  const lines: string[] = []

  lines.push(`- name: ${yamlStr(name)}`)
  lines.push(`  paths:`)
  lines.push(`    - ${yamlStr(route.path)}`)
  lines.push(`  methods:`)
  for (const m of route.methods) lines.push(`    - ${yamlStr(m)}`)
  lines.push(`  tags: [${tags.map(yamlStr).join(', ')}]`)
  lines.push(`  enabled: true`)
  if (route.description) {
    lines.push(`  description: ${yamlStr(route.description)}`)
  }
  lines.push(`  plugins:`)
  for (const plugin of route.plugins) {
    lines.push(...serializePlugin(plugin, '    '))
  }

  return lines
}

/** Generate Format A (App-config style) YAML for a list of external, non-excluded routes. */
export function generateFormatA(routes: RouteDefinition[]): string {
  if (routes.length === 0) return ''
  const blocks = routes.map((r) => serializeRoute(r).join('\n'))
  return `${blocks.join('\n\n')}\n`
}
