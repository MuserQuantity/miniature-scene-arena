import { z } from 'zod'
import type { SceneRecord } from './catalog'

export const MAX_PREVIEW_BYTES = 4 * 1024 * 1024
export const MAX_HTML_BYTES = MAX_PREVIEW_BYTES - 16 * 1024
export const MAX_COVER_BYTES = 2 * 1024 * 1024
export const MAX_DRAFT_BYTES = 8 * 1024 * 1024

export const sceneDraftSchema = z.object({
  formatVersion: z.literal(1),
  title: z.string().trim().min(2, '标题至少需要 2 个字符').max(80, '标题最多 80 个字符'),
  slug: z.string().min(3, '地址至少需要 3 个字符').max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '地址只能包含小写英文字母、数字和中划线'),
  subtitle: z.string().max(160),
  description: z.string().max(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(12, '最多填写 12 个标签'),
  prompt: z.string().min(1, '请填写创作提示词').max(60000, '提示词最多 60000 个字符'),
  promptSource: z.string().max(500),
  model: z.string().max(120),
  modelVersion: z.string().max(100),
  thinking: z.string().max(100),
  agent: z.string().max(120),
  agentVersion: z.string().max(100),
  parameters: z.record(z.string(), z.json()),
  notes: z.string().max(10000),
  renderer: z.enum(['rainy-konbini', 'html']),
  html: z.string().max(MAX_HTML_BYTES),
  cover: z.string().max(3 * 1024 * 1024).refine((value) => !value || value === '/images/rainy-konbini.png' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value), '封面必须是本地 PNG、JPEG 或 WebP 图像'),
}).strict()

export type SceneDraft = z.infer<typeof sceneDraftSchema>

export function createDraft(scene?: SceneRecord): SceneDraft {
  return {
    formatVersion: 1,
    title: scene?.title ?? '',
    slug: scene?.slug ?? '',
    subtitle: scene?.subtitle ?? '',
    description: scene?.description ?? '',
    tags: [...(scene?.tags ?? [])],
    prompt: scene?.prompt ?? '',
    promptSource: scene?.promptSource ?? '用户提供',
    model: scene?.model ?? '',
    modelVersion: '',
    thinking: scene?.thinking ?? '',
    agent: scene?.agent ?? '',
    agentVersion: '',
    parameters: {},
    notes: scene?.notes ?? '',
    renderer: scene?.renderer ?? 'html',
    html: '',
    cover: scene?.cover ?? '',
  }
}

export function validateHtml(html: string): string | null {
  if (!html.trim()) return '请先粘贴或导入场景 HTML。'
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) return '场景 HTML 太大，请将文件缩减到 4 MB 以下。'
  if (!/<html(?:\s|>)/i.test(html) || !/<\/html\s*>/i.test(html)) return '请提供包含 <html> 与 </html> 的完整 HTML 文件。'
  return null
}
