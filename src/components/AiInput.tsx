import { useState, useEffect, useRef } from "react";
import { storage } from "../utils/storage";
import { callOpenAIStream } from "../utils/api";
import { getCharacters, getChapters } from "../utils/storageWrapper";
import Modal from "./Modal";
import type { ApiConfig, ModelConfig, Character, Chapter } from "../types";

interface AiInputProps {
  onGenerate: (content: string) => void;
  onStreaming?: (content: string) => void;
  placeholder?: string;
  buttonText?: string;
  showModelSelector?: boolean;
  systemPrompt?: string;
  className?: string;
  currentNovelId?: string | null;
}

export default function AiInput({
  onGenerate,
  onStreaming,
  placeholder = "输入提示...",
  buttonText = "生成",
  showModelSelector = true,
  systemPrompt,
  className = "",
  currentNovelId,
}: AiInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingTokens, setThinkingTokens] = useState(1000);
  const [currentModelConfig, setCurrentModelConfig] =
    useState<ModelConfig | null>(null);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [selectedChapterContents, setSelectedChapterContents] = useState<
    string[]
  >([]);
  const [selectedChapterDescriptions, setSelectedChapterDescriptions] =
    useState<string[]>([]);
  const [characterTab, setCharacterTab] = useState<"summary" | "full">(
    "summary",
  ); // 添加人物信息显示选项
  const [chapterContentTab, setChapterContentTab] = useState<
    "summary" | "full"
  >("summary"); // 添加章节内容显示选项

  // 添加用于非流式输出的内容预览状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  // 使用useRef来跟踪完整内容
  const fullContentRef = useRef("");
  const allContentRef = useRef(""); // 用于跟踪所有内容，包括原始数据

  // 添加一个ref来引用预览窗口的滚动容器
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // 当预览内容更新时，自动滚动到底部
  useEffect(() => {
    if (showPreview && previewScrollRef.current) {
      previewScrollRef.current.scrollTop =
        previewScrollRef.current.scrollHeight;
    }
  }, [previewContent, showPreview]);

  useEffect(() => {
    const settings = storage.getSettings();
    setApis(settings.apis);
    setSelectedApiId(
      settings.selectedApiId ||
        (settings.apis.length > 0 ? settings.apis[0].id : null),
    );

    if (settings.selectedApiId) {
      const selectedApi = settings.apis.find(
        (api) => api.id === settings.selectedApiId,
      );
      if (selectedApi) {
        setSelectedModel(selectedApi.selectedModel);
        const modelConfig = selectedApi.models.find(
          (m) => m.name === selectedApi.selectedModel,
        );
        setCurrentModelConfig(modelConfig || null);
      }
    }
  }, []);

  useEffect(() => {
    if (currentNovelId) {
      loadCharacters(currentNovelId);
      loadChapters(currentNovelId);
    }
  }, [currentNovelId]);

  const loadCharacters = async (novelId: string) => {
    const loaded = await getCharacters(novelId);
    setCharacters(loaded);
  };

  const loadChapters = async (novelId: string) => {
    const loaded = await getChapters(novelId);
    setChapters(loaded);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("请输入提示");
      return;
    }

    if (!selectedApiId) {
      alert("请先在设置中配置 API");
      return;
    }

    setIsGenerating(true);
    // 重置内容引用
    fullContentRef.current = "";
    allContentRef.current = ""; // 重置所有内容

    try {
      const selectedApi = apis.find((api) => api.id === selectedApiId);
      if (!selectedApi) {
        throw new Error("未找到 API 配置");
      }

      const modelConfig = selectedApi.models.find(
        (m) => m.name === selectedModel,
      );
      if (!modelConfig) {
        throw new Error("未找到模型配置");
      }

      // 构建增强的 system prompt
      let enhancedSystemPrompt = systemPrompt || "";

      // 添加选中的人物信息
      if (selectedCharacters.length > 0) {
        enhancedSystemPrompt += "\n\n参考人物信息：\n";
        selectedCharacters.forEach((charId) => {
          const char = characters.find((c) => c.id === charId);
          if (char) {
            let charDescription = "";
            if (characterTab === "summary") {
              // 如果有摘要则使用摘要，否则使用性格或背景的简短描述
              charDescription =
                char.summary ||
                `${char.personality || ""} ${char.background || ""}`.trim() ||
                "暂无描述";
            } else {
              // 使用完整的人物信息
              charDescription = `姓名：${char.name}，性别：${char.gender || "未指定"}，性格：${char.personality || "未填写"}，背景：${char.background || "未填写"}，关系：${char.relationships || "未填写"}，备注：${char.notes || "无"}`;
            }
            enhancedSystemPrompt += `- ${char.name}：${charDescription}\n`;
          }
        });
      }

      // 添加选中的章节信息
      if (selectedChapterContents.length > 0) {
        enhancedSystemPrompt += "\n\n参考章节正文：\n";
        selectedChapterContents.forEach((chapId) => {
          const chap = chapters.find((c) => c.id === chapId);
          if (chap) {
            let chapterContent = "";
            if (chapterContentTab === "summary") {
              // 使用章节标题和内容的简短摘要
              const contentPreview = chap.content
                ? `${chap.content.substring(0, 200)}...`
                : "无内容";
              chapterContent = `章节 ${chap.order}：${chap.title} - ${contentPreview}`;
            } else {
              // 使用完整的章节内容
              chapterContent = `章节 ${chap.order}：${chap.title}\n内容：${chap.content || "无内容"}`;
            }
            enhancedSystemPrompt += `${chapterContent}\n`;
          }
        });
      }
      if (selectedChapterDescriptions.length > 0) {
        enhancedSystemPrompt += "\n\n参考章节描述：\n";
        selectedChapterDescriptions.forEach((chapId) => {
          const chap = chapters.find((c) => c.id === chapId);
          if (chap && chap.description) {
            let chapterDescription = "";
            if (chapterContentTab === "summary") {
              // 使用简短的描述
              chapterDescription = `章节 ${chap.order}：${chap.title}\n描述：${chap.description}`;
            } else {
              // 使用完整的描述信息
              chapterDescription = `章节 ${chap.order}：${chap.title}\n完整描述：${chap.description}`;
            }
            enhancedSystemPrompt += `${chapterDescription}\n`;
          }
        });
      }

      // 如果没有提供onStreaming回调，我们仍然需要显示生成的内容
      if (!onStreaming) {
        setShowPreview(true);
        setPreviewContent(""); // 初始化为空
        allContentRef.current = ""; // 初始化所有内容
      }

      await callOpenAIStream(
        prompt,
        enhancedSystemPrompt,
        selectedModel,
        selectedApi,
        enableThinking ? thinkingTokens : 0,
        (chunk, fullText) => {
          // 累积格式化内容
          if (chunk) {
            fullContentRef.current = fullText;
          }

          if (onStreaming) {
            // 如果有onStreaming回调，传递格式化内容
            onStreaming(fullText);
          }
        },
        (rawData) => {
          // 添加原始数据到所有内容中，用于预览
          allContentRef.current = rawData;

          // 只有在没有onStreaming回调时才更新预览
          if (!onStreaming) {
            setPreviewContent(allContentRef.current);
          }
        },
      );

      // 如果有onStreaming回调，在生成完成后关闭预览弹窗
      if (onStreaming && showPreview) {
        setShowPreview(false);
      }

      onGenerate(fullContentRef.current);
      setPrompt("");
      // 在生成完成后关闭预览（如果还没有关闭的话）
      if (showPreview) {
        setTimeout(() => setShowPreview(false), 1000);
      }
    } catch (error) {
      // 发生错误时关闭预览弹窗
      if (showPreview) {
        setShowPreview(false);
      }
      alert(`生成失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApiChange = (apiId: string) => {
    setSelectedApiId(apiId);
    const api = apis.find((a) => a.id === apiId);
    if (api) {
      setSelectedModel(api.selectedModel);
      const modelConfig = api.models.find((m) => m.name === api.selectedModel);
      setCurrentModelConfig(modelConfig || null);
      setEnableThinking(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    const api = apis.find((a) => a.id === selectedApiId);
    if (api) {
      const modelConfig = api.models.find((m) => m.name === model);
      setCurrentModelConfig(modelConfig || null);
      setEnableThinking(false);
    }
  };

  const toggleCharacter = (charId: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(charId)
        ? prev.filter((id) => id !== charId)
        : [...prev, charId],
    );
  };

  const toggleChapter = (chapId: string) => {
    if (chapterContentTab === "full") {
      setSelectedChapterContents((prev) =>
        prev.includes(chapId)
          ? prev.filter((id) => id !== chapId)
          : [...prev, chapId],
      );
    } else {
      setSelectedChapterDescriptions((prev) =>
        prev.includes(chapId)
          ? prev.filter((id) => id !== chapId)
          : [...prev, chapId],
      );
    }
  };

  return (
    <div
      className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${className}`}
    >
      {/* 预览弹窗 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                AI 生成内容预览
              </h3>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>
            <div
              ref={previewScrollRef}
              className="p-4 overflow-y-auto grow bg-slate-900"
            >
              <pre className="whitespace-pre-wrap warp-break-words text-slate-300">
                {previewContent || "正在生成..."}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end">
              <button
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                onClick={() => setShowPreview(false)}
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {showModelSelector && (
          <div className="space-y-2">
            {apis.length === 0 ? (
              <div className="text-sm text-slate-500">
                请在设置中配置 API 和模型
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 whitespace-nowrap">
                    API:
                  </label>
                  <select
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedApiId || ""}
                    onChange={(e) => handleApiChange(e.target.value)}
                    disabled={isGenerating}
                  >
                    {apis.map((api) => (
                      <option key={api.id} value={api.id}>
                        {api.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 whitespace-nowrap">
                    模型:
                  </label>
                  {selectedApiId ? (
                    <select
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={isGenerating}
                    >
                      {apis
                        .find((api) => api.id === selectedApiId)
                        ?.models.map((model) => (
                          <option key={model.name} value={model.name}>
                            {model.name}
                            {model.canThink && " 🧠"}
                            {model.canUseTools && " 🔧"}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-500">请选择 API</span>
                  )}
                </div>

                {currentModelConfig && currentModelConfig.canThink && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          id="enable-thinking"
                          checked={enableThinking}
                          onChange={(e) => setEnableThinking(e.target.checked)}
                          disabled={isGenerating}
                          className="rounded"
                        />
                        <span>🧠 启用思考模式</span>
                      </label>
                      <span className="text-xs text-yellow-400">
                        {enableThinking ? "⚠️ 费用较高" : "💰 节省费用"}
                      </span>
                    </div>
                    {enableThinking && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">
                            思考额度:
                          </label>
                          <input
                            type="range"
                            min="100"
                            max="10000"
                            step="100"
                            value={thinkingTokens}
                            onChange={(e) =>
                              setThinkingTokens(parseInt(e.target.value))
                            }
                            disabled={isGenerating}
                            className="flex-1"
                          />
                          <span className="text-xs text-slate-300 w-16 text-right">
                            {thinkingTokens}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          思考模式下，模型会先进行推理思考，再生成最终答案
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 上下文选择器 */}
        {currentNovelId && (characters.length > 0 || chapters.length > 0) && (
          <div className="border border-slate-600 rounded-lg p-3">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowContextSelector(true)}
            >
              <span className="text-sm font-medium text-slate-300">
                📚 添加上下文参考{" "}
                <span className="text-slate-500 font-normal">
                  （人物/章节）
                </span>
              </span>
              <span className="text-slate-400">▶</span>
            </button>
            {(selectedCharacters.length > 0 ||
              selectedChapterContents.length > 0 ||
              selectedChapterDescriptions.length > 0) && (
              <div className="text-xs text-green-400 mt-2">
                ✓ 已选择 {selectedCharacters.length} 个人物，
                {selectedChapterContents.length} 个章节正文，
                {selectedChapterDescriptions.length} 个章节描述
              </div>
            )}
          </div>
        )}

        {/* 上下文选择器 Modal */}
        <Modal
          isOpen={showContextSelector}
          onClose={() => setShowContextSelector(false)}
          title="添加上下文参考"
          maxWidth="2xl"
          footer={
            <button
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => setShowContextSelector(false)}
            >
              关闭
            </button>
          }
        >
          <div className="space-y-4">
            {characters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    选择人物：
                  </label>
                  <div className="flex bg-slate-700 rounded-lg p-1">
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        characterTab === "summary"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setCharacterTab("summary")}
                    >
                      📝 摘要
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        characterTab === "full"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setCharacterTab("full")}
                    >
                      📄 全文
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {characters.map((char) => (
                    <button
                      key={char.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedCharacters.includes(char.id)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                      onClick={() => toggleCharacter(char.id)}
                    >
                      {char.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chapters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    选择章节：
                  </label>
                  <div className="flex bg-slate-700 rounded-lg p-1">
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        chapterContentTab === "summary"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setChapterContentTab("summary")}
                    >
                      📝 摘要
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        chapterContentTab === "full"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setChapterContentTab("full")}
                    >
                      📄 全文
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapters.map((chap) => (
                    <button
                      key={chap.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        chapterContentTab === "full" &&
                        selectedChapterContents.includes(chap.id)
                          ? "bg-purple-600 text-white"
                          : chapterContentTab === "summary" &&
                              selectedChapterDescriptions.includes(chap.id)
                            ? "bg-purple-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                      onClick={() => toggleChapter(chap.id)}
                    >
                      #{chap.order} {chap.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>

        <div>
          <textarea
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={isGenerating}
          />
          <div className="text-xs text-slate-500 mt-1">
            💡 输入你想要 AI 生成的内容描述，然后点击下方按钮开始生成
          </div>
        </div>
        <button
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? "生成中..." : buttonText}
        </button>
      </div>
    </div>
  );
}

