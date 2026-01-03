import { useState } from 'react'
import type { PromptConfig } from '../../../types'
import { DEFAULT_PROMPTS } from '../../../types'
import { storage } from '../../../utils/storage'

export default function PromptSettings() {
  const [editedPrompts, setEditedPrompts] = useState<PromptConfig>(DEFAULT_PROMPTS)

  const handleSave = () => {
    const settings = storage.getSettings()
    settings.prompts = editedPrompts
    storage.saveSettings(settings)
    alert('Prompt 配置已保存')
  }

  const handleReset = () => {
    if (confirm('确定要清除已保存的 Prompt 配置并恢复默认设置吗？此操作不可撤销。')) {
      const settings = storage.getSettings()
      // 清除存储的 prompts
      settings.prompts = DEFAULT_PROMPTS
      storage.saveSettings(settings)
      // 重置本地状态
      setEditedPrompts(DEFAULT_PROMPTS)
      alert('已清除保存的配置并恢复默认设置')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">📝 生成章节正文 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 生成小说章节正文的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateContent}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateContent: e.target.value })}
          placeholder="输入生成章节正文的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{characters}'}、{'{chapterTitle}'}、{'{chapterDescription}'}、{'{existingContent}'}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">📋 生成章节描述 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 生成章节描述的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateDescription}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateDescription: e.target.value })}
          placeholder="输入生成章节描述的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{chapterTitle}'}、{'{previousChapterTitle}'}、{'{previousChapterDescription}'}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">👤 生成人物 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 生成人物设定的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateCharacter}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateCharacter: e.target.value })}
          placeholder="输入生成人物设定的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{input}'}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">📖 生成小说描述 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 生成小说描述/简介的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateNovelDescription}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateNovelDescription: e.target.value })}
          placeholder="输入生成小说描述的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{input}'}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">👥 批量创建人物 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 批量生成人物设定的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateBatchCharacters}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateBatchCharacters: e.target.value })}
          placeholder="输入批量创建人物的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{input}'}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4">📚 批量创建章节 Prompt</h3>
        <p className="text-slate-400 mb-4">用于 AI 批量生成章节大纲的提示词模板</p>
        <textarea
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
          rows={15}
          value={editedPrompts.generateBatchChapters}
          onChange={(e) => setEditedPrompts({ ...editedPrompts, generateBatchChapters: e.target.value })}
          placeholder="输入批量创建章节的 prompt 模板..."
        />
        <div className="mt-2 text-xs text-slate-500">
          可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{input}'}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
          onClick={handleSave}
        >
          💾 保存配置
        </button>
        <button
          className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          onClick={handleReset}
        >
          🔄 恢复默认
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-600 rounded-2xl p-4">
        <h4 className="font-semibold text-blue-400 mb-2">💡 提示</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• 使用占位符可以动态插入小说、人物、章节等信息</li>
          <li>• 修改 Prompt 后需要点击"保存配置"才能生效</li>
          <li>• 如果不满意可以点击"恢复默认"回到初始配置</li>
        </ul>
      </div>
    </div>
  )
}