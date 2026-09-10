import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildZip } from './download'

describe('buildZip', () => {
  it('produces a ZIP that a real unzip tool can list and extract correctly', () => {
    const files = [
      { name: 'routes-app-config.yaml', content: '- name: "V1-test-routes"\n  enabled: true\n' },
      { name: 'routes-kong-deck.yaml', content: `- name: 'V1Test-\${{ env "DECK_ENV" }}'\n` },
    ]
    const bytes = buildZip(files)

    const dir = mkdtempSync(join(tmpdir(), 'gw-zip-test-'))
    const zipPath = join(dir, 'out.zip')
    writeFileSync(zipPath, bytes)

    try {
      const listing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf-8' })
      expect(listing).toContain('routes-app-config.yaml')
      expect(listing).toContain('routes-kong-deck.yaml')

      const extractedA = execFileSync('unzip', ['-p', zipPath, 'routes-app-config.yaml'], { encoding: 'utf-8' })
      expect(extractedA).toBe(files[0].content)

      const extractedB = execFileSync('unzip', ['-p', zipPath, 'routes-kong-deck.yaml'], { encoding: 'utf-8' })
      expect(extractedB).toBe(files[1].content)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
