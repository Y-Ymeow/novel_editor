import { useState } from 'react'
import type { Novel } from '../../../types'
import { storage } from '../../../utils/storage'
import Modal from '../../../components/Modal'
import AiInput from '../../../components/AiInput'

interface BatchChapterFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (chapters: Array<{ title: string; description: string }>) => void
  currentNovel: Novel | null
}

export default function BatchChapterForm({
  isOpen,
  onClose,
  onSubmit,
  currentNovel
}: BatchChapterFormProps) {
  const [batchInput, setBatchInput] = useState('')

  const handleBatchAiGenerate = (generated: string) => {
    try {
      let jsonStr = generated

      const firstBracket = generated.indexOf('[')
      const lastBracket = generated.lastIndexOf(']')

      if (firstBracket !== -1 && lastBracket !== -1) {
        jsonStr = generated.substring(firstBracket, lastBracket + 1)
      }

      jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      jsonStr = jsonStr.replace(/'/g, '"')

      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseError) {
        jsonStr = jsonStr.replace(/new\s+\w+/g, '')
        jsonStr = jsonStr.replace(/function\s*\(/g, '')
        parsed = Function(`(${jsonStr})`)()
      }

      if (Array.isArray(parsed)) {
        const entries = parsed.map((item: any) => {
          if (typeof item === 'object' && item.title) {
            return JSON.stringify(item)
          }
          return ''
        }).filter(Boolean)

        if (entries.length > 0) {
          setBatchInput(entries.join('\n'))
          alert(`已生成 ${entries.length} 个完整章节信息，请确认后创建！`)
        } else {
          throw new Error('解析的数组中没有找到有效的章节信息')
        }
      } else {
        throw new Error('AI 返回的不是有效的数组格式')
      }
    } catch (error) {
      alert(`无法解析 AI 返回的内容\n\n错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleBatchCreate = async () => {
    if (!batchInput.trim()) {
      alert('请输入要创建的章节描述')
      return
    }

    const lines = batchInput.split('\n').filter(line => line.trim())
    const chapterList: Array<{ title: string; description: string }> = []

    for (const line of lines) {
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const chapterData = JSON.parse(line)
          chapterList.push({
            title: chapterData.title || '',
            description: chapterData.description || ''
          })
          continue
        } catch (e) {
          console.error(e)
        }
      }

      let title = ''
      let description = ''

      if (line.includes('：') || line.includes(':')) {
        const parts = line.split(/[:：]/)
        if (parts.length >= 1) {
          title = parts[0].trim()
          if (parts.length >= 2) {
            description = parts.slice(1).join('').trim()
          }
        }
      } else {
        title = line.trim()
      }

      chapterList.push({ title, description })
    }

    onSubmit(chapterList)
    setBatchInput('')
  }

  const getBatchChaptersPrompt = () => {
    const settings = storage.getSettings()
    const prompt = settings.prompts?.generateBatchChapters || ''
    return prompt
      .replace(/\{\{novelTitle\}\}/g, currentNovel?.title || "")
      .replace(/\{\{novelDescription\}\}/g, currentNovel?.description || "")
      .replace(/\{\{input\}\}/g, "")
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量创建章节"
      maxWidth="2xl"
      footer={
        <div className="flex gap-2">
          <button
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
            onClick={handleBatchCreate}
          >
            创建
          </button>
          <button
            className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
          <h3 className="text-lg font-semibold mb-3">🤖 AI 生成章节列表</h3>
          <AiInput
            onGenerate={handleBatchAiGenerate}
            placeholder="描述你想要创建的章节，例如：生成10个章节，讲述主角从初入江湖到成为武林盟主的故事..."
            buttonText="🚀 生成章节列表"
            currentNovelId={currentNovel?.id || null}
            systemPrompt={getBatchChaptersPrompt()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">章节列表（每行一个）</label>
          <textarea
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            rows={10}
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="第一章：初入江湖&#10;第二章：拜师学艺&#10;第三章：初露锋芒&#10;或者直接输入：&#10;生成5个章节"
          />
          <p className="text-xs text-slate-500 mt-2">
            每行一个章节，可以使用"标题: 描述"格式，也可以只输入标题
          </p>
        </div>
      </div>
    </Modal>
  )
}
