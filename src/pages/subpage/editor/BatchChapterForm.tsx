import { useState } from 'react'
import type { Novel } from '../../../types'
import { storage } from '../../../utils/storage'
import { callOpenAIWithTools } from '../../../utils/api'
import { createChaptersTool } from '../../../utils/tools'
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

  const handleBatchAiGenerate = async (generated: string) => {
    try {
      const result = await callOpenAIWithTools(
        generated,
        [createChaptersTool],
        getBatchChaptersPrompt()
      )

      if (result.toolCalls && result.toolCalls.length > 0) {
        const chapterToolCall = result.toolCalls.find(tc => tc.name === 'create_chapters')
        
        if (chapterToolCall && chapterToolCall.arguments.chapters) {
          const validChapters = chapterToolCall.arguments.chapters.filter((item: any) =>
            typeof item === 'object' && item.title
          )

          if (validChapters.length > 0) {
            const entries = validChapters.map((chapter: any) => {
              return JSON.stringify(chapter)
            })
            setBatchInput(entries.join('\n'))
            alert(`已生成 ${validChapters.length} 个完整章节信息，请确认后创建！`)
          } else {
            throw new Error('工具返回的数组中没有找到有效的章节信息')
          }
        } else {
          throw new Error('AI 没有调用 create_chapters 工具')
        }
      } else if (result.content) {
        console.log('AI返回了文本内容而不是工具调用:', result.content)
        throw new Error('AI没有调用工具，而是返回了文本内容。这可能是因为:\n1. 模型不支持工具调用 - 请在设置中勾选"支持工具"选项\n2. 模型选择错误 - 请选择支持工具调用的模型\n\n返回内容: ' + result.content.substring(0, 200) + '...')
      } else {
        throw new Error('AI 没有返回工具调用，请重试')
      }
    } catch (error) {
      console.error('调用 AI 失败:', error)
      alert('AI 调用失败: ' + (error instanceof Error ? error.message : '未知错误'))
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
