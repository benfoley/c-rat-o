import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BACKUP_FILENAME,
  buildFindBackupFileUrl,
  buildMultipartCreateBody,
  createFile,
  downloadFile,
  findBackupFile,
  updateFile,
} from './googleDrive'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildFindBackupFileUrl', () => {
  it('builds a query that matches the backup filename and excludes trashed files', () => {
    const url = buildFindBackupFileUrl()
    expect(url).toContain(encodeURIComponent(`name = '${BACKUP_FILENAME}'`))
    expect(url).toContain(encodeURIComponent('trashed = false'))
    expect(url).toContain('spaces=drive')
  })
})

describe('buildMultipartCreateBody', () => {
  it('wraps metadata and content in the multipart boundary format', () => {
    const body = buildMultipartCreateBody('{"a":1}', 'my-file.json')
    expect(body).toContain('"name":"my-file.json"')
    expect(body).toContain('"mimeType":"application/json"')
    expect(body).toContain('{"a":1}')
    expect(body.startsWith('--c-rat-o-multipart-boundary')).toBe(true)
    expect(body.endsWith('--c-rat-o-multipart-boundary--')).toBe(true)
  })
})

describe('findBackupFile', () => {
  it('returns the first matching file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: 'file-1', modifiedTime: '2026-01-01T00:00:00.000Z' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await findBackupFile('token-123')

    expect(result).toEqual({ id: 'file-1', modifiedTime: '2026-01-01T00:00:00.000Z' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://www.googleapis.com/drive/v3/files')
    expect(init.headers.Authorization).toBe('Bearer token-123')
  })

  it('returns null when no file matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [] }) }))
    expect(await findBackupFile('token-123')).toBeNull()
  })
})

describe('downloadFile', () => {
  it('fetches the file content with alt=media', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"hello":"world"}' })
    vi.stubGlobal('fetch', fetchMock)

    const content = await downloadFile('token-123', 'file-1')

    expect(content).toBe('{"hello":"world"}')
    expect(fetchMock.mock.calls[0][0]).toContain('/files/file-1?alt=media')
  })
})

describe('createFile and updateFile', () => {
  it('createFile POSTs a multipart body and returns the new file ref', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-file', modifiedTime: '2026-02-01T00:00:00.000Z' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createFile('token-123', '{"x":1}')

    expect(result).toEqual({ id: 'new-file', modifiedTime: '2026-02-01T00:00:00.000Z' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('uploadType=multipart')
    expect(init.method).toBe('POST')
    expect(init.body).toContain('{"x":1}')
  })

  it('updateFile PATCHes the existing file id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'file-1', modifiedTime: '2026-02-02T00:00:00.000Z' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await updateFile('token-123', 'file-1', '{"x":2}')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/files/file-1?uploadType=media')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe('{"x":2}')
  })
})

describe('error handling', () => {
  it('throws with the response status when the Drive API returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid token' }),
    )
    await expect(findBackupFile('bad-token')).rejects.toThrow(/401/)
  })
})
