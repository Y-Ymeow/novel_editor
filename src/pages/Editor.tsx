import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { Chapter, Character, Novel } from "../types";
import { storage } from "../utils/storage";
import {
  buildContentPrompt,
  buildDescriptionPrompt as buildDescPrompt,
} from "../utils/promptManager";
import ChapterList from "./subpage/editor/ChapterList";
import ChapterEditor from "./subpage/editor/ChapterEditor";
import ChapterForm from "./subpage/editor/ChapterForm";
import BatchChapterForm from "./subpage/editor/BatchChapterForm";

export default function Editor() {
  const [searchParams] = useSearchParams();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentNovel, setCurrentNovel] = useState<Novel | null>(null);
  const [content, setContent] = useState("");
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [showBatchChapterForm, setShowBatchChapterForm] = useState(false);
  const [showEditDescription, setShowEditDescription] = useState(false);
  const [currentNovelId] = useState<string | null>(() => {
    const settings = storage.getSettings();
    return settings.selectedNovelId ?? null;
  });
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const [chapterFormData, setChapterFormData] = useState({
    title: "",
    description: "",
    status: "draft" as "draft" | "in-progress" | "completed",
  });

  // 计算是否有未保存的更改
  const hasChanges = currentChapter ? content !== currentChapter.content : false;

  useEffect(() => {
    if (isStreaming) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }, [streamingContent, isStreaming]);

  const loadChapters = async (novelId: string) => {
    const loaded = await storage.getChapters(novelId);
    setChapters(loaded);
  };

  const loadCharacters = async (novelId: string) => {
    const loaded = await storage.getCharacters(novelId);
    setCharacters(loaded);
  };

  const loadNovel = async (novelId: string) => {
    const novels = await storage.getNovels();
    const novel = novels.find((n) => n.id === novelId);
    if (novel) {
      setCurrentNovel(novel);
    }
  };

  const loadChapter = async (chapterId: string, novelId: string) => {
    const chapters = await storage.getChapters(novelId);
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      setCurrentChapter(chapter);
      setContent(chapter.content);
    }
  };

  useEffect(() => {
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
  }, [currentNovelId]);

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
    await storage.saveChapters(updatedChapters);
    setCurrentChapter(updatedChapter);
    setContent(content);
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

    try {
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
      await storage.saveChapter(newChapter);

      setCurrentChapter(newChapter);
      setContent("");
      setShowChapterForm(false);
      setChapterFormData({ title: "", description: "", status: "draft" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert('创建章节失败: ' + errorMessage)
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (confirm("确定要删除这个章节吗？")) {
      await storage.deleteChapter(id);
      if (currentNovelId) {
        const currentNovelChapters = await storage.getChapters(currentNovelId);
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

  const handleBatchCreateChapters = async (chapterList: Array<{ title: string; description: string }>) => {
    if (!currentNovelId) {
      alert("请先选择小说");
      return;
    }

    try {
      const maxOrder = Math.max(0, ...chapters.map((c) => c.order));
      const newChapters: Chapter[] = chapterList.map((item, index) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        novelId: currentNovelId,
        title: item.title,
        order: maxOrder + 1 + index,
        description: item.description,
        content: "",
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      setChapters([...chapters, ...newChapters]);
      await storage.saveChapters([...chapters, ...newChapters]);

      if (newChapters.length > 0) {
        setCurrentChapter(newChapters[0]);
        setContent("");
      }

      setShowBatchChapterForm(false);
      alert(`成功创建 ${newChapters.length} 个章节`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert('批量创建章节失败: ' + errorMessage)
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

  const handleSaveDescription = async () => {
    if (!currentChapter) return;

    const updatedChapter = {
      ...currentChapter,
      description: chapterFormData.description,
      updatedAt: Date.now(),
    };
    const updatedChapters = chapters.map((ch) =>
      ch.id === currentChapter.id ? updatedChapter : ch,
    );
    setChapters(updatedChapters);
    await storage.saveChapters(updatedChapters);
    setCurrentChapter(updatedChapter);
    setContent(updatedChapter.content);
    setShowEditDescription(false);
  };

  const buildSystemPrompt = () => {
    const novelTitle = currentNovel?.title || "";
    const novelDescription = currentNovel?.description || "";

    let charactersStr = "";
    if (characters.length > 0) {
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
        <div className="hidden lg:block lg:w-80">
          <ChapterList
            chapters={chapters}
            currentChapter={currentChapter}
            onChapterSelect={(chapter) => {
              setCurrentChapter(chapter);
              setContent(chapter.content);
            }}
            onChapterDelete={handleDeleteChapter}
            onAddChapter={() => setShowChapterForm(true)}
            onBatchAddChapter={() => setShowBatchChapterForm(true)}
          />
        </div>

        {/* 主内容区 */}
        <ChapterEditor
          currentChapter={currentChapter}
          currentNovel={currentNovel}
          content={content}
          setContent={setContent}
          characters={characters}
          onSave={handleSave}
          onEditDescription={() => {
            setChapterFormData({
              ...chapterFormData,
              description: currentChapter?.description || "",
            });
            setShowEditDescription(true);
          }}
          onAiGenerate={handleAiGenerate}
          onStreaming={handleStreaming}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          buildSystemPrompt={buildSystemPrompt}
          onShowMobileDrawer={() => setShowMobileDrawer(true)}
          hasChanges={hasChanges}
        />
      </div>

      {/* 移动端抽屉 */}
      {showMobileDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileDrawer(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 z-50 lg:hidden shadow-2xl">
            <ChapterList
              chapters={chapters}
              currentChapter={currentChapter}
              onChapterSelect={(chapter) => {
                setCurrentChapter(chapter);
                setContent(chapter.content);
              }}
              onChapterDelete={handleDeleteChapter}
              onAddChapter={() => setShowChapterForm(true)}
              onBatchAddChapter={() => setShowBatchChapterForm(true)}
              isMobile={true}
              onCloseMobile={() => setShowMobileDrawer(false)}
            />
          </div>
        </>
      )}

      {/* 创建章节表单 */}
      <ChapterForm
        isOpen={showChapterForm}
        onClose={() => {
          setShowChapterForm(false);
          setChapterFormData({
            title: "",
            description: "",
            status: "draft",
          });
        }}
        onSubmit={handleCreateChapter}
        formData={chapterFormData}
        onFormDataChange={setChapterFormData}
        isEditing={false}
        currentNovelId={currentNovelId}
        buildDescriptionPrompt={buildDescriptionPrompt}
      />

      {/* 编辑章节描述表单 */}
      <ChapterForm
        isOpen={showEditDescription}
        onClose={() => setShowEditDescription(false)}
        onSubmit={handleSaveDescription}
        formData={chapterFormData}
        onFormDataChange={setChapterFormData}
        isEditing={true}
        currentChapter={currentChapter}
        currentNovelId={currentNovelId}
        buildDescriptionPrompt={buildDescriptionPrompt}
        buildEditDescriptionPrompt={buildEditDescriptionPrompt}
      />

      {/* 批量创建章节表单 */}
      <BatchChapterForm
        isOpen={showBatchChapterForm}
        onClose={() => setShowBatchChapterForm(false)}
        onSubmit={handleBatchCreateChapters}
        currentNovel={currentNovel}
      />
    </div>
  );
}