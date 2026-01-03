import type { Chapter } from '../../../types'
import { useNavigate } from 'react-router-dom'

interface ChapterListProps {
  chapters: Chapter[]
  currentChapter: Chapter | null
  onChapterSelect: (chapter: Chapter) => void
  onChapterDelete: (id: string) => void
  onAddChapter: () => void
  onBatchAddChapter?: () => void
  isMobile?: boolean
  onCloseMobile?: () => void
}

export default function ChapterList({
  chapters,
  currentChapter,
  onChapterSelect,
  onChapterDelete,
  onAddChapter,
  onBatchAddChapter,
  isMobile = false,
  onCloseMobile
}: ChapterListProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full bg-slate-800">
      <div className="p-4 border-b border-slate-700">
        {isMobile && (
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white">章节列表</h3>
            {onCloseMobile && (
              <button
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                onClick={onCloseMobile}
              >
                ✕
              </button>
            )}
          </div>
        )}
        <button
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          onClick={() => {
            onAddChapter()
            if (isMobile && onCloseMobile) onCloseMobile()
          }}
        >
          + 添加章节
        </button>
        {onBatchAddChapter && (
          <button
            className="w-full px-4 py-2 mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
            onClick={() => {
              onBatchAddChapter()
              if (isMobile && onCloseMobile) onCloseMobile()
            }}
          >
            🤖 批量创建
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {chapters.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            暂无章节
            <br />
            点击上方按钮创建
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`p-4 cursor-pointer transition-colors ${
                  currentChapter?.id === ch.id
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-700/50 text-slate-300"
                }`}
                onClick={() => {
                  onChapterSelect(ch)
                  if (isMobile && onCloseMobile) onCloseMobile()
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      #{ch.order} {ch.title}
                    </div>
                    {ch.description && (
                      <div className="text-xs mt-1 opacity-70 truncate">
                        {ch.description}
                      </div>
                    )}
                    {ch.content && (
                      <div className="text-xs mt-1 opacity-70">
                        {ch.content.length} 字
                      </div>
                    )}
                  </div>
                  <button
                    className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChapterDelete(ch.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile()
            navigate("/resources")
          }}
        >
          👤 人物卡片
        </button>
        <button
          className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile()
            navigate("/settings")
          }}
        >
          ⚙️ 设置
        </button>
        <button
          className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition-colors"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile()
            handleBack()
          }}
        >
          ← 返回小说列表
        </button>
      </div>
    </div>
  )
}