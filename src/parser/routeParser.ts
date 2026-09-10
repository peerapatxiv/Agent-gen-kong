import type { ParseIssue, PluginDefinition, RouteDefinition } from '@/types/route'
import { HTTP_METHODS, extractDomainInfo, nextRouteId, parseMethods } from '@/utils/normalization'
import { parseScopeList } from './scopeParser'
import {
  buildPluginConfig,
  classifyFieldKeyword,
  defaultValidateTokenPlugin,
  type FieldEntry,
  type FieldKind,
} from './pluginParser'

const METHOD_ALTERNATION = HTTP_METHODS.join('|')
const ANCHOR_RE = new RegExp(`\\b(${METHOD_ALTERNATION})\\s+(\\/[\\w\\-{}.]+(?:\\/[\\w\\-{}.]+)+)(\\?\\S*)?`, 'i')
const PATH_ONLY_RE = /(\/[\w\-{}.]+(?:\/[\w\-{}.]+)+)(\?\S*)?/
const TABLE_ROW_RE = /^\s*\|(.*)\|\s*$/
const EXCLUDE_MARKER_RE = /\b(internal service|internal|exclude[ds]?)\b/i
const FIELD_LINE_RE = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/

export interface PluginSegment {
  name: string
  fields: FieldEntry[]
}

export interface ExtractedRoute {
  path: string
  methods: string[]
  methodAmbiguous: boolean
  requiredScopeRaw?: string
  pluginSegments: PluginSegment[]
  domainOverride?: string
  descriptionOverride?: string
  tagsOverride?: string[]
  excluded: boolean
  exclusionReason?: string
  sourceText: string
  hasQueryString: boolean
}

/** Turn one field's ordered list into { routeLevel, plugins } segments, split on `Plugin:` boundaries. */
function buildSegments(fields: FieldEntry[]): { routeLevel: FieldEntry[]; plugins: PluginSegment[] } {
  const routeLevel: FieldEntry[] = []
  const plugins: PluginSegment[] = []
  let current: PluginSegment | null = null
  for (const f of fields) {
    if (f.kind === 'plugin') {
      current = { name: f.value.trim(), fields: [] }
      plugins.push(current)
    } else if (current) {
      current.fields.push(f)
    } else {
      routeLevel.push(f)
    }
  }
  return { routeLevel, plugins }
}

function firstRequiredScopeRaw(fields: FieldEntry[]): string | undefined {
  return fields.find((f) => f.kind === 'requiredScope')?.value
}

/** Build the final RouteDefinition (methods, scopes, plugins, tags, domain/version) from a raw extracted row. */
export function finalizeRoute(extracted: ExtractedRoute, external: boolean, issues: ParseIssue[]): RouteDefinition {
  const id = nextRouteId()
  const domainInfo = extractDomainInfo(extracted.path)
  const scopes = parseScopeList(extracted.requiredScopeRaw)

  let plugins: PluginDefinition[]
  if (extracted.pluginSegments.length === 0) {
    plugins = [defaultValidateTokenPlugin(scopes)]
  } else {
    plugins = extracted.pluginSegments.map((seg) => buildPluginConfig(seg.name, seg.fields, scopes))
  }

  const route: RouteDefinition = {
    id,
    path: extracted.path,
    methods: extracted.methods,
    scopes,
    domain: extracted.domainOverride ?? domainInfo.domain,
    version: domainInfo.version,
    plugins,
    description: extracted.descriptionOverride,
    tags: extracted.tagsOverride,
    external,
    excluded: extracted.excluded,
    sourceText: extracted.sourceText,
    exclusionReason: extracted.exclusionReason,
    methodAmbiguous: extracted.methodAmbiguous,
    versionMissing: domainInfo.versionMissing,
    hasQueryString: extracted.hasQueryString,
  }

  if (extracted.methodAmbiguous) {
    issues.push({ level: 'warning', message: `HTTP method could not be confidently determined for "${extracted.path}".`, routeId: id })
  }
  if (domainInfo.versionMissing) {
    issues.push({ level: 'warning', message: `No API version segment (v1, v2, ...) found in "${extracted.path}" — flagged for manual review.`, routeId: id })
  }
  if (extracted.hasQueryString) {
    issues.push({ level: 'warning', message: `Path "${extracted.path}" appears to contain a query string — review before using.`, routeId: id })
  }

  return route
}

// ---------------------------------------------------------------------------
// Table parsing
// ---------------------------------------------------------------------------

type HeaderCell = FieldKind | 'path' | null

function classifyHeaderCell(cell: string): HeaderCell {
  const key = cell.trim().toLowerCase()
  if (['api', 'path', 'endpoint', 'route'].includes(key)) return 'path'
  return classifyFieldKeyword(cell)
}

function splitTableRow(line: string): string[] {
  const match = line.match(TABLE_ROW_RE)
  const inner = match ? match[1] : line
  return inner.split('|').map((c) => c.trim())
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')
}

interface TableGroup {
  startLine: number
  lines: string[]
}

function collectTableGroups(lines: string[]): TableGroup[] {
  const groups: TableGroup[] = []
  let current: TableGroup | null = null
  lines.forEach((line, i) => {
    if (TABLE_ROW_RE.test(line)) {
      if (!current) current = { startLine: i, lines: [] }
      current.lines.push(line)
    } else if (current) {
      groups.push(current)
      current = null
    }
  })
  if (current) groups.push(current)
  return groups
}

function extractFromCell(cell: string): { path: string | null; inlineMethod?: string; excluded: boolean; exclusionReason?: string; hasQueryString: boolean } {
  const excluded = EXCLUDE_MARKER_RE.test(cell)
  const exclusionReason = excluded ? (cell.match(EXCLUDE_MARKER_RE)?.[0] ?? 'excluded') : undefined
  const anchorMatch = cell.match(ANCHOR_RE)
  if (anchorMatch) {
    return { path: anchorMatch[2], inlineMethod: anchorMatch[1].toUpperCase(), excluded, exclusionReason, hasQueryString: Boolean(anchorMatch[3]) }
  }
  const pathMatch = cell.match(PATH_ONLY_RE)
  if (pathMatch) {
    return { path: pathMatch[1], excluded, exclusionReason, hasQueryString: Boolean(pathMatch[2]) }
  }
  return { path: null, excluded, exclusionReason, hasQueryString: false }
}

export function parseTableGroup(group: TableGroup): ExtractedRoute[] {
  const rows = group.lines.map(splitTableRow)
  let dataRows = rows
  let columnMap: HeaderCell[] | null = null

  if (rows.length > 0) {
    const headerCandidate = rows[0].map(classifyHeaderCell)
    const recognizedCount = headerCandidate.filter(Boolean).length
    if (recognizedCount >= 2 && headerCandidate.includes('path')) {
      columnMap = headerCandidate
      dataRows = rows.slice(1)
    }
  }

  if (!columnMap) {
    columnMap = ['path', 'method', 'requiredScope', 'generateScope']
  }

  const results: ExtractedRoute[] = []
  for (const cells of dataRows) {
    if (isSeparatorRow(cells)) continue
    if (cells.every((c) => c === '')) continue

    const pathColIdx = columnMap.indexOf('path')
    const pathCell = pathColIdx >= 0 ? (cells[pathColIdx] ?? '') : (cells[0] ?? '')
    const { path, inlineMethod, excluded, exclusionReason, hasQueryString } = extractFromCell(pathCell)
    if (!path) continue

    const getCell = (kind: HeaderCell) => {
      const idx = columnMap!.indexOf(kind)
      return idx >= 0 ? cells[idx] : undefined
    }

    const methodCell = getCell('method')
    const methods = methodCell ? parseMethods(methodCell) : inlineMethod ? [inlineMethod] : []
    const methodAmbiguous = methods.length === 0

    const requiredScopeCell = getCell('requiredScope')
    const pluginCell = getCell('plugin')
    const domainCell = getCell('domain')
    const descriptionCell = getCell('description')
    const tagsCell = getCell('tags')

    const pluginSegments: PluginSegment[] = pluginCell
      ? pluginCell
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name, fields: requiredScopeCell ? [{ kind: 'requiredScope' as const, value: requiredScopeCell }] : [] }))
      : []

    results.push({
      path,
      methods,
      methodAmbiguous,
      requiredScopeRaw: requiredScopeCell,
      pluginSegments,
      domainOverride: domainCell ? domainCell.toLowerCase() : undefined,
      descriptionOverride: descriptionCell || undefined,
      tagsOverride: tagsCell
        ? tagsCell
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : undefined,
      excluded,
      exclusionReason,
      sourceText: group.lines.join('\n'),
      hasQueryString,
    })
  }
  return results
}

// ---------------------------------------------------------------------------
// Prose parsing
// ---------------------------------------------------------------------------

interface ProseBlock {
  anchorLine: string
  inlineMethod?: string
  path: string
  hasQueryString: boolean
  fields: FieldEntry[]
  raw: string[]
}

const MULTILINE_FIELDS: FieldKind[] = ['requiredScope', 'generateScope']

export function parseProseLines(lines: string[]): ProseBlock[] {
  const blocks: ProseBlock[] = []
  let current: ProseBlock | null = null
  let continuationKind: FieldKind | null = null

  const findAnchor = (line: string) => {
    const anchorMatch = line.match(ANCHOR_RE)
    if (anchorMatch) {
      return { path: anchorMatch[2], inlineMethod: anchorMatch[1].toUpperCase(), hasQueryString: Boolean(anchorMatch[3]) }
    }
    const pathMatch = line.match(PATH_ONLY_RE)
    if (pathMatch) {
      return { path: pathMatch[1], inlineMethod: undefined, hasQueryString: Boolean(pathMatch[2]) }
    }
    return null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const anchor = findAnchor(line)

    if (anchor) {
      current = { anchorLine: line, inlineMethod: anchor.inlineMethod, path: anchor.path, hasQueryString: anchor.hasQueryString, fields: [], raw: [rawLine] }
      blocks.push(current)
      continuationKind = null
      continue
    }

    if (!current) continue // stray line before any anchor — ignore

    if (line === '') {
      continuationKind = null
      current.raw.push(rawLine)
      continue
    }

    const fieldMatch = line.match(FIELD_LINE_RE)
    if (fieldMatch) {
      const kind = classifyFieldKeyword(fieldMatch[1])
      if (kind) {
        const value = fieldMatch[2].trim()
        current.fields.push({ kind, value })
        current.raw.push(rawLine)
        continuationKind = value === '' && MULTILINE_FIELDS.includes(kind) ? kind : null
        continue
      }
    }

    if (continuationKind) {
      const entry = current.fields[current.fields.length - 1]
      if (entry && entry.kind === continuationKind) {
        entry.value = entry.value ? `${entry.value}\n${line}` : line
        current.raw.push(rawLine)
        continue
      }
    }

    // Unrecognized, non-blank line: ends this block's extent (line itself is not consumed).
    current = null
    continuationKind = null
  }

  return blocks
}

export function proseBlockToExtracted(block: ProseBlock): ExtractedRoute {
  const excluded = EXCLUDE_MARKER_RE.test(block.anchorLine)
  const exclusionReason = excluded ? (block.anchorLine.match(EXCLUDE_MARKER_RE)?.[0] ?? 'excluded') : undefined

  const methodField = block.fields.find((f) => f.kind === 'method')
  const methods = block.inlineMethod ? [block.inlineMethod] : methodField ? parseMethods(methodField.value) : []

  const { plugins } = buildSegments(block.fields)
  const requiredScopeRaw = firstRequiredScopeRaw(block.fields)

  const domainField = block.fields.find((f) => f.kind === 'domain')
  const descriptionField = block.fields.find((f) => f.kind === 'description')
  const tagsField = block.fields.find((f) => f.kind === 'tags')

  return {
    path: block.path,
    methods,
    methodAmbiguous: methods.length === 0,
    requiredScopeRaw,
    pluginSegments: plugins,
    domainOverride: domainField?.value.toLowerCase(),
    descriptionOverride: descriptionField?.value || undefined,
    tagsOverride: tagsField
      ? tagsField.value
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : undefined,
    excluded,
    exclusionReason,
    sourceText: block.raw.join('\n').trim(),
    hasQueryString: block.hasQueryString,
  }
}

/** Split the raw ticket text into table-row lines and prose lines, preserving line order within each group. */
export function splitTableAndProse(text: string): { tableGroups: TableGroup[]; proseLines: string[] } {
  const lines = text.split(/\r\n|\r|\n/)
  const tableGroups = collectTableGroups(lines)
  const proseLines = lines.map((line) => (TABLE_ROW_RE.test(line) ? '' : line))
  return { tableGroups, proseLines }
}

export function extractRoutesFromText(text: string): ExtractedRoute[] {
  const { tableGroups, proseLines } = splitTableAndProse(text)
  const tableRoutes = tableGroups.flatMap(parseTableGroup)
  const proseBlocks = parseProseLines(proseLines)
  const proseRoutes = proseBlocks.map(proseBlockToExtracted)
  return [...tableRoutes, ...proseRoutes]
}
