import assert from 'node:assert/strict'
import { test } from 'node:test'
import { markdownTitle, parseInline, parseMarkdown } from '../../lib/markdown'

test('prompt markdown is parsed into safe block structures', () => {
  const blocks = parseMarkdown('# 01 樱花铁路小站\r\n\r\n请使用 **Three.js** 制作场景，\n交付 `index.html`。\n\n- 要求一\n- 要求二\n  续行\n\n1. 第一步\n2) 第二步\n\n```\n<script>alert(1)</script>\n```\n## 结尾')
  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'paragraph', 'list', 'list', 'code', 'heading'])
  assert.equal(blocks[0].type === 'heading' && blocks[0].level, 1)
  assert.deepEqual(blocks[1].type === 'paragraph' && blocks[1].inline, [{ type: 'text', text: '请使用 ' }, { type: 'strong', text: 'Three.js' }, { type: 'text', text: ' 制作场景， 交付 ' }, { type: 'code', text: 'index.html' }, { type: 'text', text: '。' }])
  assert.deepEqual(blocks[2].type === 'list' && [blocks[2].ordered, blocks[2].items.map((item) => item.map((part) => part.text).join(''))], [false, ['要求一', '要求二 续行']])
  assert.deepEqual(blocks[3].type === 'list' && [blocks[3].ordered, blocks[3].items.length], [true, 2])
  assert.equal(blocks[4].type === 'code' && blocks[4].text, '<script>alert(1)</script>')
  assert.equal(markdownTitle('# 19 无人游乐园的旋转木马\n\n正文'), '19 无人游乐园的旋转木马')
  assert.equal(markdownTitle('没有标题'), '')
  assert.deepEqual(parseInline('plain'), [{ type: 'text', text: 'plain' }])
  assert.deepEqual(parseMarkdown(''), [])
})
