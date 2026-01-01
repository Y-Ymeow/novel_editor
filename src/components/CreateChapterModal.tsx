import Modal from "./Modal";
import AiInput from "./AiInput";
import FullscreenTextarea from "../components/FullscreenTextarea";

export interface ChapterFormData {
  title: string;
  description: string;
  status: "draft" | "in-progress" | "completed";
}

export interface CreateChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterFormData: ChapterFormData;
  setChapterFormData: (data: ChapterFormData) => void;
  onCreate: () => void;
  buildDescriptionPrompt: () => string;
  currentNovelId: string | null;
}

export default function CreateChapterModal({
  isOpen,
  onClose,
  chapterFormData,
  setChapterFormData,
  onCreate,
  buildDescriptionPrompt,
  currentNovelId,
}: CreateChapterModalProps) {
  const normalizeStatus = (
    value: string,
  ): "draft" | "completed" | "in-progress" => {
    if (value == "completed") return "completed";
    if (value == "in-progress") return "in-progress";
    return "draft";
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="创建新章节"
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
            onClick={onCreate}
          >
            创建
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            章节标题 *
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={chapterFormData.title}
            onChange={(e) =>
              setChapterFormData({
                ...chapterFormData,
                title: e.target.value,
              })
            }
            placeholder="第1章：开始"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            章节描述
          </label>
          <FullscreenTextarea
            value={chapterFormData.description}
            onChange={(value) =>
              setChapterFormData({
                ...chapterFormData,
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
            onGenerate={(generatedDescription) => {
              setChapterFormData({
                ...chapterFormData,
                description: generatedDescription,
              });
            }}
            placeholder="描述你想要的章节内容，例如：主角遇到一个神秘人物..."
            buttonText="✨ 生成章节描述"
            showModelSelector={true}
            systemPrompt={buildDescriptionPrompt()}
            currentNovelId={currentNovelId}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            状态
          </label>
          <select
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={chapterFormData.status}
            onChange={(e) =>
              setChapterFormData({
                ...chapterFormData,
                status: normalizeStatus(e.target.value),
              })
            }
          >
            <option value="draft">草稿</option>
            <option value="in-progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
