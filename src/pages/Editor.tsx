import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Chapter, Character, Novel } from "../types";
import { storage } from "../utils/storage";
import {
  getChapters,
  saveChapters,
  getCharacters,
  getNovels,
  deleteChapter,
} from "../utils/storageWrapper";
import {
  buildContentPrompt,
  buildDescriptionPrompt as buildDescPrompt,
} from "../utils/promptManager";
import AiInput from "../components/AiInput";
import FullscreenTextarea from "../components/FullscreenTextarea";
import Modal from "../components/Modal";

export default function Editor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentNovel, setCurrentNovel] = useState<Novel | null>(null);
  const [content, setContent] = useState("");
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [currentNovelId] = useState<string | null>(() => {
    const settings = storage.getSettings();
    return settings.selectedNovelId ?? null;
  });
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showEditDescription, setShowEditDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  const [chapterFormData, setChapterFormData] = useState({
    title: "",
    description: "",
    status: "draft" as "draft" | "in-progress" | "completed",
  });

  const normalizeStatus = (
    value: string,
  ): "draft" | "completed" | "in-progress" => {
    if (value == "completed") return "completed";
    if (value == "in-progress") return "in-progress";
    return "draft";
  };

  useEffect(() => {
    if (isStreaming && editorTextareaRef.current) {
      editorTextareaRef.current.scrollTop =
        editorTextareaRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming]);

  const loadChapters = async (novelId: string) => {
    const loaded = await getChapters(novelId);
    setChapters(loaded);
  };

  const loadCharacters = async (novelId: string) => {
    const loaded = await getCharacters(novelId);
    setCharacters(loaded);
  };

  const loadNovel = async (novelId: string) => {
    const novels = await getNovels();
    const novel = novels.find((n) => n.id === novelId);
    if (novel) {
      setCurrentNovel(novel);
    }
  };

  const loadChapter = async (chapterId: string, novelId: string) => {
    const chapters = await getChapters(novelId);
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      setCurrentChapter(chapter);
      setContent(chapter.content);
    }
  };

  const settings = storage.getSettings();

  if (settings.selectedNovelId) {
    loadChapters(settings.selectedNovelId);
    loadCharacters(settings.selectedNovelId);
    loadNovel(settings.selectedNovelId);

    const chapterId = searchParams.get("chapter");
    if (chapterId) {
      loadChapter(chapterId, settings.selectedNovelId);
    }
  }

  const handleSave = async () => {
    if (!currentChapter) {
      alert("请先选择章节");
      return;
    }

    const updatedChapter = {
      ...currentChapter,
      content,
      updatedAt: Date.now(),
    };
    const updatedChapters = chapters.map((ch) =>
      ch.id === currentChapter.id ? updatedChapter : ch,
    );
    setChapters(updatedChapters);
    await saveChapters(updatedChapters);
    setCurrentChapter(updatedChapter);
  };

  const handleCreateChapter = async () => {
    if (!chapterFormData.title.trim()) {
      alert("请输入章节标题");
      return;
    }

    if (!currentNovelId) {
      alert("请先选择小说");
      return;
    }

    const maxOrder = Math.max(0, ...chapters.map((c) => c.order));
    const newChapter: Chapter = {
      id: Date.now().toString(),
      novelId: currentNovelId,
      title: chapterFormData.title,
      order: maxOrder + 1,
      description: chapterFormData.description,
      content: "",
      status: chapterFormData.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setChapters([...chapters, newChapter]);
    await saveChapters([...chapters, newChapter]);
    setCurrentChapter(newChapter);
    setContent("");
    setShowChapterForm(false);
    setChapterFormData({ title: "", description: "", status: "draft" });
  };

  const handleDeleteChapter = async (id: string) => {
    if (confirm("确定要删除这个章节吗？")) {
      // 直接删除数据库中的记录
      await deleteChapter(id);
      // 更新当前显示的章节列表（只显示当前小说的）
      if (currentNovelId) {
        const currentNovelChapters = await getChapters(currentNovelId);
        setChapters(currentNovelChapters);
        if (currentChapter?.id === id) {
          setCurrentChapter(
            currentNovelChapters.length > 0 ? currentNovelChapters[0] : null,
          );
          setContent(
            currentNovelChapters.length > 0
              ? currentNovelChapters[0].content
              : "",
          );
        }
      }
    }
  };

  const handleAiGenerate = (generatedContent: string) => {
    setContent(content + "\n\n" + generatedContent);
    setStreamingContent("");
    setIsStreaming(false);
  };

  const handleStreaming = (streaming: string) => {
    setIsStreaming(true);
    setStreamingContent(content + "\n\n" + streaming);
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleSaveDescription = async () => {
    if (!currentChapter) return;

    const updatedChapter = {
      ...currentChapter,
      description: editDescription,
      updatedAt: Date.now(),
    };
    const updatedChapters = chapters.map((ch) =>
      ch.id === currentChapter.id ? updatedChapter : ch,
    );
    setChapters(updatedChapters);
    await saveChapters(updatedChapters);
    setCurrentChapter(updatedChapter);
    setShowEditDescription(false);
  };

  const buildSystemPrompt = () => {
    const novelTitle = currentNovel?.title || "";
    const novelDescription = currentNovel?.description || "";

    let charactersStr = "";
    if (characters.length > 0) {
      // 只包含选中的人物，如果没有选中任何人物，则包含所有人物
      const filteredCharacters = characters;

      charactersStr = filteredCharacters
        .map(
          (c) => `- ${c.name}：${c.personality || c.background || "暂无描述"}`,
        )
        .join("\n");
    }

    const chapterTitle = currentChapter?.title || "";
    const chapterDescription = currentChapter?.description || "";
    const existingContent = content ? content.slice(-500) : "";

    return buildContentPrompt(
      novelTitle,
      novelDescription,
      charactersStr,
      chapterTitle,
      chapterDescription,
      existingContent,
    );
  };

  const buildDescriptionPrompt = () => {
    const novelTitle = currentNovel?.title || "";
    const novelDescription = currentNovel?.description || "";
    const chapterTitle = chapterFormData.title || "";

    let previousChapterTitle = "无";
    let previousChapterDescription = "无";

    if (chapters.length > 0) {
      const previousChapter = chapters[chapters.length - 1];
      previousChapterTitle = previousChapter.title;
      previousChapterDescription = previousChapter.description || "无";
    }

    return buildDescPrompt(
      novelTitle,
      novelDescription,
      chapterTitle,
      previousChapterTitle,
      previousChapterDescription,
    );
  };

  const buildEditDescriptionPrompt = () => {
    const novelTitle = currentNovel?.title || "";
    const novelDescription = currentNovel?.description || "";
    const chapterTitle = currentChapter?.title || "";

    let previousChapterTitle = "无";
    let previousChapterDescription = "无";

    if (currentChapter) {
      const currentIndex = chapters.findIndex(
        (c) => c.id === currentChapter.id,
      );
      if (currentIndex > 0) {
        const previousChapter = chapters[currentIndex - 1];
        previousChapterTitle = previousChapter.title;
        previousChapterDescription = previousChapter.description || "无";
      }
    }

    return buildDescPrompt(
      novelTitle,
      novelDescription,
      chapterTitle,
      previousChapterTitle,
      previousChapterDescription,
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 桌面端侧边栏 */}
        <div className="hidden lg:flex lg:w-80 bg-slate-800 border-r border-slate-700 flex-col">
          <div className="p-4 border-b border-slate-700">
            <button
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => setShowChapterForm(true)}
            >
              + 添加章节
            </button>
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
                      setCurrentChapter(ch);
                      setContent(ch.content);
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
                          e.stopPropagation();
                          handleDeleteChapter(ch.id);
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
              onClick={() => navigate("/characters")}
            >
              👤 人物卡片
            </button>
            <button
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              onClick={() => navigate("/settings")}
            >
              ⚙️ 设置
            </button>
            <button
              className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition-colors"
              onClick={handleBack}
            >
              ← 返回小说列表
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  className="lg:hidden px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors shrink-0"
                  onClick={() => setShowMobileDrawer(true)}
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
                    onClick={() => {
                      setEditDescription(currentChapter.description || "");
                      setShowEditDescription(true);
                    }}
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
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={!currentChapter}
                >
                  💾 保存
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 max-md:flex-none flex flex-col p-4 overflow-hidden min-h-100">
            {currentChapter ? (
              <div className="flex-1 flex flex-col">
                <FullscreenTextarea
                  ref={editorTextareaRef}
                  value={streamingContent || content}
                  onChange={setContent}
                  placeholder="开始写作..."
                  className="min-h-100 max-md:min-h-150 flex-1"
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
              onGenerate={handleAiGenerate}
              onStreaming={handleStreaming}
              placeholder="描述你想要生成的内容，例如：主角遇到了一个神秘的人..."
              buttonText="🚀 生成内容"
              currentNovelId={currentNovelId}
              systemPrompt={buildSystemPrompt()} // 这个systemPrompt现在支持选中人物和章节的参数
            />
          </div>
        </div>
      </div>

      {/* 移动端抽屉 */}
      {showMobileDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileDrawer(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-slate-800 z-50 lg:hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">章节列表</h3>
              <button
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                onClick={() => setShowMobileDrawer(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-slate-700">
              <button
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                onClick={() => {
                  setShowChapterForm(true);
                  setShowMobileDrawer(false);
                }}
              >
                + 添加章节
              </button>
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
                        setCurrentChapter(ch);
                        setContent(ch.content);
                        setShowMobileDrawer(false);
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
                            e.stopPropagation();
                            handleDeleteChapter(ch.id);
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
                  setShowMobileDrawer(false);
                  navigate("/characters");
                }}
              >
                👤 人物卡片
              </button>
              <button
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                onClick={() => {
                  setShowMobileDrawer(false);
                  navigate("/settings");
                }}
              >
                ⚙️ 设置
              </button>
              <button
                className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition-colors"
                onClick={() => {
                  setShowMobileDrawer(false);
                  handleBack();
                }}
              >
                ← 返回小说列表
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={showEditDescription}
        onClose={() => setShowEditDescription(false)}
        title="编辑章节描述"
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => setShowEditDescription(false)}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              onClick={handleSaveDescription}
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

      <Modal
        isOpen={showChapterForm}
        onClose={() => {
          setShowChapterForm(false);
          setChapterFormData({
            title: "",
            description: "",
            status: "draft",
          });
        }}
        title="创建新章节"
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => {
                setShowChapterForm(false);
                setChapterFormData({
                  title: "",
                  description: "",
                  status: "draft",
                });
              }}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              onClick={handleCreateChapter}
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
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
}
