import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { lock } from 'proper-lockfile'
import { z } from 'zod'
import type { SceneRecord } from './model'
import { isErrno, normalizeCover, readBoundedFile } from './files'
import { createSceneSchema, defaultSceneMetadata, MAX_COVER_BYTES, MAX_HTML_BYTES, MAX_METADATA_BYTES, sceneRecordSchema, SceneError, updateSceneSchema } from './schema'

const MAX_CATALOG_BYTES = 16 * 1024 * 1024
const storedSceneSchema = sceneRecordSchema.extend({
  renderer: z.enum(['html', 'rainy-konbini']),
  htmlAsset: z.string().regex(/^[a-f0-9]{64}\.html$/).optional(),
  coverAsset: z.string().regex(/^[a-f0-9]{64}\.webp$/).optional(),
}).strict().refine((scene) => scene.renderer === 'html' ? Boolean(scene.htmlAsset) : scene.id === 'scene-001', '场景程序或历史记录格式不正确')
const catalogSchema = z.object({ formatVersion: z.literal(1), scenes: z.array(storedSceneSchema).max(10000) }).strict()
type StoredScene = z.infer<typeof storedSceneSchema>

export function createSceneStore(directory: string) {
  const root = path.resolve(directory)
  const catalogFile = path.join(root, 'catalog.json')
  const assetDirectory = path.join(root, 'assets')

  async function readCatalog(): Promise<StoredScene[]> {
    let data: Buffer
    try { data = await readBoundedFile(catalogFile, MAX_CATALOG_BYTES) }
    catch (error) { if (isErrno(error, 'ENOENT')) return []; throw error }
    try {
      const records = catalogSchema.parse(JSON.parse(data.toString('utf8'))).scenes
      if (new Set(records.map((scene) => scene.id)).size !== records.length) throw new Error('Duplicate IDs')
      return records
    } catch {
      throw new SceneError(500, 'STORAGE_INVALID', '场景目录损坏或格式不兼容，请检查存储文件；原数据未被覆盖。')
    }
  }

  function activeScenes(records: StoredScene[]): StoredScene[] {
    const result = records.filter((scene) => scene.renderer === 'html')
    if (new Set(result.map((scene) => scene.slug)).size !== result.length) throw new SceneError(500, 'STORAGE_INVALID', '场景目录包含重复地址。')
    return result
  }

  function publicRecord(scene: StoredScene): SceneRecord {
    return sceneRecordSchema.parse({ ...scene, cover: scene.coverAsset ? `/scenes/${scene.slug}/cover/${scene.coverAsset}` : scene.cover })
  }

  async function writeCatalog(records: StoredScene[]) {
    const contents = JSON.stringify(catalogSchema.parse({ formatVersion: 1, scenes: records }), null, 2)
    if (Buffer.byteLength(contents) > MAX_CATALOG_BYTES) throw new SceneError(409, 'CATALOG_FULL', '场景目录超过容量限制。')
    const temporary = `${catalogFile}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, contents, { flag: 'wx', mode: 0o600, flush: true })
      await rename(temporary, catalogFile)
    } finally {
      await unlink(temporary).catch((error: unknown) => { if (!isErrno(error, 'ENOENT')) throw error })
    }
  }

  async function writeAsset(contents: Buffer, extension: 'html' | 'webp') {
    const name = `${createHash('sha256').update(contents).digest('hex')}.${extension}`
    await mkdir(assetDirectory, { recursive: true, mode: 0o700 })
    const filename = path.join(assetDirectory, name)
    try { await writeFile(filename, contents, { flag: 'wx', mode: 0o600, flush: true }) }
    catch (error) {
      if (!isErrno(error, 'EEXIST')) throw error
      if (!(await readBoundedFile(filename, extension === 'html' ? MAX_HTML_BYTES : MAX_COVER_BYTES)).equals(contents)) {
        throw new SceneError(500, 'STORAGE_INVALID', '场景资源的内容校验失败。')
      }
    }
    return name
  }

  async function writeLocked<T>(operation: (records: StoredScene[]) => Promise<T>): Promise<T> {
    await mkdir(root, { recursive: true, mode: 0o700 })
    const release = await lock(catalogFile, { realpath: false, stale: 30000, update: 10000, retries: { retries: 20, minTimeout: 50, maxTimeout: 250 } })
    try { return await operation(await readCatalog()) }
    finally { await release() }
  }

  function checkMetadata(scene: StoredScene) {
    if (Buffer.byteLength(JSON.stringify(publicRecord(scene))) > MAX_METADATA_BYTES) {
      throw new SceneError(422, 'METADATA_TOO_LARGE', '场景元数据不能超过 256 KiB。')
    }
  }

  async function storedRecord(id: string) {
    return activeScenes(await readCatalog()).find((scene) => scene.id === id)
  }

  async function readDocument(id: string) {
    const scene = await storedRecord(id)
    if (!scene) throw new SceneError(404, 'SCENE_NOT_FOUND', '未找到场景。')
    if (!scene.htmlAsset) throw new SceneError(500, 'STORAGE_INVALID', '场景缺少程序文件。')
    const html = (await readBoundedFile(path.join(assetDirectory, scene.htmlAsset), MAX_HTML_BYTES)).toString('utf8')
    return { scene: publicRecord(scene), html }
  }

  async function coverContents(scene: StoredScene | undefined, asset?: string) {
    if (!scene?.coverAsset || asset !== undefined && asset !== scene.coverAsset) return undefined
    return readBoundedFile(path.join(assetDirectory, scene.coverAsset), MAX_COVER_BYTES)
  }

  return {
    async list() {
      return activeScenes(await readCatalog()).map(publicRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
    },
    async get(id: string) {
      const scene = await storedRecord(id)
      return scene ? publicRecord(scene) : undefined
    },
    async findBySlug(slug: string) {
      const scene = activeScenes(await readCatalog()).find((scene) => scene.slug === slug)
      return scene ? publicRecord(scene) : undefined
    },
    async create(input: unknown) {
      const { html, cover, slug, ...metadata } = createSceneSchema.parse(input)
      return writeLocked(async (records) => {
        if (activeScenes(records).some((scene) => scene.slug === slug)) throw new SceneError(409, 'SLUG_EXISTS', '该场景地址已经存在。')
        const date = new Date().toISOString()
        const scene: StoredScene = {
          ...defaultSceneMetadata, ...metadata, id: `scene-${randomUUID()}`, slug, renderer: 'html',
          cover: '', version: 1, createdAt: date, updatedAt: date,
        }
        checkMetadata(scene)
        const image = cover ? await normalizeCover(cover) : undefined
        scene.htmlAsset = await writeAsset(Buffer.from(html), 'html')
        if (image) scene.coverAsset = await writeAsset(image, 'webp')
        checkMetadata(scene)
        await writeCatalog([...records, scene])
        return publicRecord(scene)
      })
    },
    async update(id: string, input: unknown, expectedVersion: number) {
      const { html, cover, ...metadata } = updateSceneSchema.parse(input)
      return writeLocked(async (records) => {
        const existing = activeScenes(records).find((scene) => scene.id === id)
        if (!existing) throw new SceneError(404, 'SCENE_NOT_FOUND', '未找到场景。')
        if (existing.version !== expectedVersion) throw new SceneError(412, 'VERSION_CONFLICT', '场景已被修改，请重新读取并合并变更。')
        const scene: StoredScene = { ...existing, ...metadata, version: existing.version + 1, updatedAt: new Date().toISOString() }
        checkMetadata(scene)
        if (html !== undefined) scene.htmlAsset = await writeAsset(Buffer.from(html), 'html')
        if (cover !== undefined) {
          const image = await normalizeCover(cover)
          if (image) scene.coverAsset = await writeAsset(image, 'webp')
          else { delete scene.coverAsset; scene.cover = '' }
        }
        checkMetadata(scene)
        await writeCatalog([...records.filter((record) => record.id !== id), scene])
        return publicRecord(scene)
      })
    },
    readDocument,
    async readHtml(id: string) {
      return (await readDocument(id)).html
    },
    async readCover(id: string) {
      return coverContents(await storedRecord(id))
    },
    async readCoverForSlug(slug: string, asset?: string) {
      const scene = activeScenes(await readCatalog()).find((record) => record.slug === slug)
      return coverContents(scene, asset)
    },
  }
}

export function getSceneStore() {
  return createSceneStore(process.env.SCENE_DATA_DIR || path.join(process.cwd(), '.scene-data'))
}
