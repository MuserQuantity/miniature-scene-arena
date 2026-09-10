import { z } from 'zod'

export const MAX_HTML_BYTES = 4 * 1024 * 1024 - 16 * 1024
export const MAX_COVER_BYTES = 2 * 1024 * 1024
export const MAX_SCENE_BYTES = 8 * 1024 * 1024
export const MAX_METADATA_BYTES = 256 * 1024

export class SceneError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'SceneError'
  }
}

export const slugSchema = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '地址只能包含小写英文字母、数字和中划线')

export const sceneMetadataSchema = z.object({
  title: z.string().trim().min(2, '标题至少需要 2 个字符').max(80),
  subtitle: z.string().max(160),
  description: z.string().max(2000),
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).transform((tags) => [...new Set(tags)]),
  prompt: z.string().max(60000),
  promptSource: z.string().max(500),
  model: z.string().max(120),
  modelVersion: z.string().max(100),
  thinking: z.string().max(100),
  agent: z.string().max(120),
  agentVersion: z.string().max(100),
  parameters: z.record(z.string(), z.json()),
  notes: z.string().max(10000),
}).strict()

export function validateHtml(html: string): string | null {
  if (!html.trim()) return '请提供场景 HTML。'
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) return '场景 HTML 太大，必须小于 4 MiB。'
  if (!/<html(?:\s|>)/i.test(html) || !/<\/html\s*>/i.test(html)) return '请提供包含 <html> 与 </html> 的完整单文件 HTML。'
  return null
}

const htmlSchema = z.string().superRefine((html, context) => {
  const error = validateHtml(html)
  if (error) context.addIssue({ code: 'custom', message: error })
})
const coverSchema = z.string().max(Math.ceil(MAX_COVER_BYTES / 3) * 4 + 64).refine(
  (value) => !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
  '封面必须是 PNG、JPEG 或 WebP 的 base64 data URL，不能使用外部地址或 SVG',
)

export const createSceneSchema = sceneMetadataSchema.partial().extend({
  title: sceneMetadataSchema.shape.title,
  slug: slugSchema,
  html: htmlSchema,
  cover: coverSchema.optional(),
}).strict()

export const updateSceneSchema = sceneMetadataSchema.partial().extend({
  html: htmlSchema.optional(),
  cover: coverSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, '至少提供一个需要修改的字段')

export const sceneRecordSchema = sceneMetadataSchema.extend({
  id: z.string().regex(/^scene-[a-z0-9-]+$/).max(80),
  slug: slugSchema,
  cover: z.string().max(1024),
  renderer: z.literal('html'),
  createdAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  updatedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  version: z.number().int().positive(),
}).strip()

export const defaultSceneMetadata = {
  subtitle: '', description: '', category: '未分类', tags: [], prompt: '', promptSource: '',
  model: '', modelVersion: '', thinking: '', agent: '', agentVersion: '', parameters: {}, notes: '',
}
