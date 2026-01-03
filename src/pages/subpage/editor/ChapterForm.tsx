import type { Chapter } from '../../../types'
import Modal from '../../../components/Modal'
import FullscreenTextarea from '../../../components/FullscreenTextarea'
import AiInput from '../../../components/AiInput'

interface ChapterFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  formData: {
    title: string
    description: string
    status: 'draft' | 'in-progress' | 'completed'
  }
  onFormDataChange: (formData: ChapterFormProps['formData']) => void
  isEditing?: boolean
  currentChapter?: Chapter | null
  currentNovelId: string | null
  buildDescriptionPrompt: () => string
  buildEditDescriptionPrompt?: () => string
}

export default function ChapterForm({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  isEditing = false,
  currentChapter,
  currentNovelId,
  buildDescriptionPrompt,
  buildEditDescriptionPrompt
}: ChapterFormProps) {
  const normalizeStatus = (
    value: string,
  ): "draft" | "completed" | "in-progress" => {
    if (value == "completed") return "completed";
    if (value == "in-progress") return "in-progress";
    return "draft";
  }

  const handleGenerateDescription = (generatedDescription: string) => {
    onFormDataChange({
      ...formData,
      description: generatedDescription,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "编辑章节描述" : "创建新章节"}
      maxWidth="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            onClick={onSubmit}
          >
            {isEditing ? "保存" : "创建"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              章节标题 *
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  title: e.target.value,
                })
              }
              placeholder="第1章：开始"
            />
          </div>
        )}

        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              章节标题
            </label>
            <div className="text-slate-300">{currentChapter?.title}</div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            章节描述
          </label>
          <FullscreenTextarea
            value={formData.description}
            onChange={(value) =>
              onFormDataChange({
                ...formData,
                description: value,
              })
            }
            placeholder="描述本章的主要情节和发展，用于 AI 生成内容"
            className="h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            AI 生成描述
          </label>
          <AiInput
            onGenerate={handleGenerateDescription}
            placeholder="描述你想要的章节内容，例如：主角遇到一个神秘人物..."
            buttonText="✨ 生成章节描述"
            showModelSelector={true}
            systemPrompt={isEditing && buildEditDescriptionPrompt ? buildEditDescriptionPrompt() : buildDescriptionPrompt()}
            currentNovelId={currentNovelId}
          />
        </div>

        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              状态
            </label>
            <select
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  status: normalizeStatus(e.target.value),
                })
              }
            >
              <option value="draft">草稿</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}