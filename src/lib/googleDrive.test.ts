import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BACKUP_FILENAME,
  BACKUP_FOLDER_NAME,
  buildFindBackupFileUrl,
  buildFindFolderUrl,
  buildMultipartCreateBody,
  createFile,
  createFolder,
  downloadFile,
  findBackupFile,
  findFolder,
  findOrCreateFolder,
  moveFileToFolder,
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

  it('restricts to a parent folder when folderId is given', () => {
    const url = buildFindBackupFileUrl({ folderId: 'folder-1' })
    expect(url).toContain(encodeURIComponent(`'folder-1' in parents`))
  })
})

describe('buildMultipartCreateBody', () => {
  it('wraps metadata and content in the multipart boundary format', () => {
    const body = buildMultipartCreateBody('{"a":1}', { filename: 'my-file.json' })
    expect(body).toContain('"name":"my-file.json"')
    expect(body).toContain('"mimeType":"application/json"')
    expect(body).toContain('{"a":1}')
    expect(body.startsWith('--c-rat-o-multipart-boundary')).toBe(true)
    expect(body.endsWith('--c-rat-o-multipart-boundary--')).toBe(true)
  })

  it('includes parents when given', () => {
    const body = buildMultipartCreateBody('{"a":1}', { parents: ['folder-1'] })
    expect(body).toContain('"parents":["folder-1"]')
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

describe('folder helpers', () => {
  it('buildFindFolderUrl matches the folder name and mimeType', () => {
    const url = buildFindFolderUrl()
    expect(url).toContain(encodeURIComponent(`name = '${BACKUP_FOLDER_NAME}'`))
    expect(url).toContain(encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder'`))
  })

  it('findFolder returns the first matching folder id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [{ id: 'folder-1' }] }) }))
    expect(await findFolder('token-123')).toBe('folder-1')
  })

  it('findFolder returns null when no folder matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [] }) }))
    expect(await findFolder('token-123')).toBeNull()
  })

  it('createFolder POSTs the folder metadata and returns the new id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'new-folder' }) })
    vi.stubGlobal('fetch', fetchMock)

    const id = await createFolder('token-123')

    expect(id).toBe('new-folder')
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toContain('"mimeType":"application/vnd.google-apps.folder"')
    expect(init.body).toContain(`"name":"${BACKUP_FOLDER_NAME}"`)
  })

  it('findOrCreateFolder reuses an existing folder instead of creating a new one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [{ id: 'existing-folder' }] }) }))
    expect(await findOrCreateFolder('token-123')).toBe('existing-folder')
  })

  it('findOrCreateFolder creates a folder when none exists yet', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-folder' }) })
    vi.stubGlobal('fetch', fetchMock)

    expect(await findOrCreateFolder('token-123')).toBe('new-folder')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('moveFileToFolder', () => {
  it('PATCHes with addParents/removeParents', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await moveFileToFolder('token-123', 'file-1', 'folder-1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/files/file-1?addParents=folder-1&removeParents=root')
    expect(init.method).toBe('PATCH')
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
