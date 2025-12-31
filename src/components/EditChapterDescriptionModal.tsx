import Modal from "./Modal";
import AiInput from "./AiInput";
import FullscreenTextarea from "../components/FullscreenTextarea";
import type { Chapter } from "../types";

interface EditChapterDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChapter: Chapter | null;
  editDescription: string;
  setEditDescription: (value: string) => void;
  onSave: () => void;
  buildEditDescriptionPrompt: () => string;
  currentNovelId: string | null;
}

export default function EditChapterDescriptionModal({
  isOpen,
  onClose,
  currentChapter,
  editDescription,
  setEditDescription,
  onSave,
  buildEditDescriptionPrompt,
  currentNovelId,
}: EditChapterDescriptionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑章节描述"
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
            onClick={onSave}
          >
            保存
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            章节标题
          </label>
          <div className="text-slate-300">{currentChapter?.title}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            章节描述
          </label>
          <FullscreenTextarea
            value={editDescription}
            onChange={setEditDescription}
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
              setEditDescription(generatedDescription);
            }}
            placeholder="描述你想要的章节内容，例如：主角遇到一个神秘人物..."
            buttonText="✨ 生成章节描述"
            showModelSelector={true}
            systemPrompt={buildEditDescriptionPrompt()}
            currentNovelId={currentNovelId}
          />
        </div>
      </div>
    </Modal>
  );
}