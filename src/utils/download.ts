export function downloadText(filename: string, content: string, mimeType = 'text/yaml'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32LE(view: DataView, pos: number, value: number) {
  view.setUint32(pos, value, true)
}
function writeUint16LE(view: DataView, pos: number, value: number) {
  view.setUint16(pos, value, true)
}

/** Build a minimal, store-only (uncompressed) ZIP archive as raw bytes. */
export function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const fileRecords: Uint8Array[] = []
  const centralRecords: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    writeUint32LE(lv, 0, 0x04034b50) // local file header signature
    writeUint16LE(lv, 4, 20) // version needed to extract
    writeUint16LE(lv, 6, 0) // flags
    writeUint16LE(lv, 8, 0) // compression method: store
    writeUint16LE(lv, 10, 0) // mod time
    writeUint16LE(lv, 12, 0) // mod date
    writeUint32LE(lv, 14, crc)
    writeUint32LE(lv, 18, data.length) // compressed size
    writeUint32LE(lv, 22, data.length) // uncompressed size
    writeUint16LE(lv, 26, nameBytes.length)
    writeUint16LE(lv, 28, 0) // extra field length
    localHeader.set(nameBytes, 30)

    fileRecords.push(localHeader, data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    writeUint32LE(cv, 0, 0x02014b50) // central directory header signature
    writeUint16LE(cv, 4, 20) // version made by
    writeUint16LE(cv, 6, 20) // version needed to extract
    writeUint16LE(cv, 8, 0) // flags
    writeUint16LE(cv, 10, 0) // compression method
    writeUint16LE(cv, 12, 0) // mod time
    writeUint16LE(cv, 14, 0) // mod date
    writeUint32LE(cv, 16, crc)
    writeUint32LE(cv, 20, data.length)
    writeUint32LE(cv, 24, data.length)
    writeUint16LE(cv, 28, nameBytes.length)
    writeUint16LE(cv, 30, 0) // extra field length
    writeUint16LE(cv, 32, 0) // comment length
    writeUint16LE(cv, 34, 0) // disk number start
    writeUint16LE(cv, 36, 0) // internal attrs
    writeUint32LE(cv, 38, 0) // external attrs
    writeUint32LE(cv, 42, offset) // local header offset
    centralHeader.set(nameBytes, 46)
    centralRecords.push(centralHeader)

    offset += localHeader.length + data.length
  }

  const centralSize = centralRecords.reduce((sum, r) => sum + r.length, 0)
  const centralOffset = offset
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  writeUint32LE(ev, 0, 0x06054b50) // end of central directory signature
  writeUint16LE(ev, 4, 0) // disk number
  writeUint16LE(ev, 6, 0) // disk with central directory
  writeUint16LE(ev, 8, files.length) // entries on this disk
  writeUint16LE(ev, 10, files.length) // total entries
  writeUint32LE(ev, 12, centralSize)
  writeUint32LE(ev, 16, centralOffset)
  writeUint16LE(ev, 20, 0) // comment length

  const totalLength = offset + centralSize + end.length
  const out = new Uint8Array(totalLength)
  let cursor = 0
  for (const chunk of [...fileRecords, ...centralRecords, end]) {
    out.set(chunk, cursor)
    cursor += chunk.length
  }
  return out
}

/** Minimal zero-dependency ZIP writer (store-only, no compression) for "Download Both". */
export function downloadZip(filename: string, files: { name: string; content: string }[]): void {
  const bytes = buildZip(files)
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
