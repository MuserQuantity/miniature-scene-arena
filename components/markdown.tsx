import { parseMarkdown, type MarkdownInline } from '@/lib/markdown'
import { cn } from '@/lib/utils'

function Inline({ parts }: { parts: MarkdownInline[] }) {
  return <>{parts.map((part, index) => part.type === 'strong' ? <strong key={index} className="font-medium text-foreground">{part.text}</strong> : part.type === 'code' ? <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{part.text}</code> : <span key={index}>{part.text}</span>)}</>
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source)
  return <div className={cn('flex flex-col gap-4 text-sm leading-7 text-foreground/85', className)}>
    {blocks.map((block, index) => {
      if (block.type === 'heading') {
        const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5'
        return <Tag key={index} className={cn('font-medium tracking-tight text-foreground', block.level === 1 ? 'text-lg' : 'text-base', index > 0 && 'pt-2')}><Inline parts={block.inline} /></Tag>
      }
      if (block.type === 'list') {
        const Tag = block.ordered ? 'ol' : 'ul'
        return <Tag key={index} className={cn('flex flex-col gap-1.5 pl-6', block.ordered ? 'list-decimal' : 'list-disc')}>{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline parts={item} /></li>)}</Tag>
      }
      if (block.type === 'code') return <pre key={index} className="overflow-auto rounded-lg border bg-background p-4 font-mono text-xs leading-6">{block.text}</pre>
      return <p key={index}><Inline parts={block.inline} /></p>
    })}
  </div>
}
