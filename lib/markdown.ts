export type MarkdownInline = { type: 'text' | 'strong' | 'code'; text: string }
export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; inline: MarkdownInline[] }
  | { type: 'paragraph'; inline: MarkdownInline[] }
  | { type: 'list'; ordered: boolean; items: MarkdownInline[][] }
  | { type: 'code'; text: string }

export function parseInline(text: string): MarkdownInline[] {
  const result: MarkdownInline[] = []
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g
  let index = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > index) result.push({ type: 'text', text: text.slice(index, match.index) })
    result.push(match[2] !== undefined ? { type: 'strong', text: match[2] } : { type: 'code', text: match[3] })
    index = match.index + match[0].length
  }
  if (index < text.length) result.push({ type: 'text', text: text.slice(index) })
  return result
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | undefined
  let code: string[] | undefined
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join(' ')) })
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) })
    paragraph = []
    list = undefined
  }
  for (const line of lines) {
    if (code) {
      if (/^\s*```/.test(line)) { blocks.push({ type: 'code', text: code.join('\n') }); code = undefined }
      else code.push(line)
      continue
    }
    if (/^\s*```/.test(line)) { flush(); code = []; continue }
    const heading = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) { flush(); blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3 | 4, inline: parseInline(heading[2]) }); continue }
    const item = /^\s*(?:([-*+])|(\d{1,3})[.)])\s+(.+)$/.exec(line)
    if (item) {
      const ordered = item[2] !== undefined
      if (paragraph.length) flush()
      if (list && list.ordered !== ordered) flush()
      list ??= { ordered, items: [] }
      list.items.push(item[3])
      continue
    }
    if (!line.trim()) { flush(); continue }
    if (list) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue }
    paragraph.push(line.trim())
  }
  if (code) blocks.push({ type: 'code', text: code.join('\n') })
  flush()
  return blocks
}

export function markdownTitle(source: string) {
  const heading = parseMarkdown(source).find((block) => block.type === 'heading')
  return heading ? heading.inline.map((part) => part.text).join('') : ''
}
