import type { RouteDefinition } from '@/types/route'
import { DECK_HOST_TEMPLATE, DECK_ROUTE_PREFIX, generateFormatBName } from './nameGenerator'
import { generateFormatBTags } from './tagGenerator'

/** Single-quote a YAML flow scalar. Kong Deck style never needs to escape a literal quote here. */
function singleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function flowList(items: string[]): string {
  return `[ ${items.join(', ')} ]`
}

/** Bare words stay bare; anything containing the `${{ ... }}` templating syntax gets single-quoted. */
function formatBTagToken(tag: string): string {
  return tag.includes('${{') ? singleQuote(tag) : tag
}

function serializeRoute(route: RouteDefinition): string[] {
  const name = generateFormatBName(route.path)
  const tags = generateFormatBTags(route).map(formatBTagToken)

  const lines: string[] = []
  lines.push(`- name: ${singleQuote(name)}`)
  lines.push(`  methods: ${flowList(route.methods)}`)
  lines.push(`  paths: ${flowList([singleQuote(`${DECK_ROUTE_PREFIX}${route.path}`)])}`)
  lines.push(`  hosts: ${flowList([singleQuote(DECK_HOST_TEMPLATE), 'localhost'])}`)
  lines.push(`  tags: ${flowList(tags)}`)
  return lines
}

/** Generate Format B (Kong Deck style) YAML for a list of external, non-excluded routes. */
export function generateFormatB(routes: RouteDefinition[]): string {
  if (routes.length === 0) return ''
  const blocks = routes.map((r) => serializeRoute(r).join('\n'))
  return `${blocks.join('\n\n')}\n`
}
