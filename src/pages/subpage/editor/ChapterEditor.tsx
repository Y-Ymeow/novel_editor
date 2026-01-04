import { useRef } from 'react'
import type { Chapter, Novel, Character } from '../../../types'
import AiInput from '../../../components/AiInput'
import FullscreenTextarea from '../../../components/FullscreenTextarea'

interface ChapterEditorProps {
  currentChapter: Chapter | null
  currentNovel: Novel | null
  content: string
  setContent: (content: string) => void
  characters: Character[]
  onSave: () => void
  onEditDescription: () => void
  onAiGenerate: (generatedContent: string) => void
  onStreaming: (streaming: string) => void
  isStreaming: boolean
  streamingContent: string
  buildSystemPrompt: () => string
  onShowMobileDrawer: () => void
  hasChanges: boolean
}

export default function ChapterEditor({
  currentChapter,
  currentNovel,
  content,
  setContent,
  onSave,
  onEditDescription,
  onAiGenerate,
  onStreaming,
  isStreaming,
  streamingContent,
  buildSystemPrompt,
  onShowMobileDrawer,
  hasChanges
}: ChapterEditorProps) {
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null)

  const currentNovelId = currentNovel?.id || null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              className="lg:hidden px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors shrink-0"
              onClick={onShowMobileDrawer}
            >
              ☰ 章节列表
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold truncate">
                {currentChapter
                  ? `#${currentChapter.order} ${currentChapter.title}`
                  : "请选择章节"}
              </h2>
              {currentNovel && (
                <div className="text-sm text-slate-400 mt-1 truncate">
                  {currentNovel.title}
                </div>
              )}
              {currentChapter && currentChapter.description && (
                <div className="text-sm text-slate-300 mt-1 truncate max-w-100">
                  📋 {currentChapter.description}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 lg:ml-2">
            {currentChapter && (
              <button
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors text-sm"
                onClick={onEditDescription}
              >
                ✏️ 编辑描述
              </button>
            )}
            {isStreaming && (
              <span className="text-sm text-green-400 animate-pulse">
                🔄 生成中...
              </span>
            )}
            <button
              className={`px-4 py-2 ${hasChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-500'} text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={onSave}
              disabled={!currentChapter}
            >
              💾 保存
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 max-md:flex-none flex flex-col p-4 min-h-0">
        {currentChapter ? (
          <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '500px' }}>
            <FullscreenTextarea
              ref={editorTextareaRef}
              value={streamingContent || content}
              onChange={setContent}
              placeholder="开始写作..."
              className="min-h-0 flex-1"
            />
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl mb-2">请先选择章节</h3>
            <p>从左侧章节列表中选择，或创建新章节</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <AiInput
          onGenerate={onAiGenerate}
          onStreaming={onStreaming}
          placeholder="描述你想要生成的内容，例如：主角遇到了一个神秘的人..."
          buttonText="🚀 生成内容"
          currentNovelId={currentNovelId}
          systemPrompt={buildSystemPrompt()}
        />
      </div>
    </div>
  )
}