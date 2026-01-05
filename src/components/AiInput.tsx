import { useState, useEffect, useRef } from "react";
import { storage } from "../utils/storage";
import { callOpenAIStream } from "../utils/api";
import Modal from "./Modal";
import type { ApiConfig, Character, Chapter, Plot } from "../types";

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

  const [characters, setCharacters] = useState<Character[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [showModelSelectorModal, setShowModelSelectorModal] = useState(false);
  const [contextTab, setContextTab] = useState<"characters" | "chapters" | "plots">("characters");
  const [characterDetailMode, setCharacterDetailMode] = useState<"summary" | "full">("summary");
  const [chapterDetailMode, setChapterDetailMode] = useState<"summary" | "full">("summary");

  // 添加用于非流式输出的内容预览状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [isThinking, setIsThinking] = useState(false);

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
      }
    }
  }, []);

  useEffect(() => {
    if (currentNovelId) {
      loadCharacters(currentNovelId);
      loadChapters(currentNovelId);
      loadPlots(currentNovelId);
    }
  }, [currentNovelId]);

  // 当打开上下文选择器时，重新加载数据以获取最新内容
  useEffect(() => {
    if (showContextSelector && currentNovelId) {
      loadCharacters(currentNovelId);
      loadChapters(currentNovelId);
      loadPlots(currentNovelId);
    }
  }, [showContextSelector, currentNovelId]);

  const loadCharacters = async (novelId: string) => {
    const loaded = await storage.getCharacters(novelId);
    setCharacters(loaded);
  };

  const loadChapters = async (novelId: string) => {
    const loaded = await storage.getChapters(novelId);
    setChapters(loaded);
  };

  const loadPlots = async (novelId: string) => {
    const loaded = await storage.getPlots(novelId);
    setPlots(loaded);
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
            if (characterDetailMode === "summary") {
              charDescription = char.summary ||
                  `${char.personality || ""} ${char.background || ""}`.trim() ||
                  "暂无描述";
            } else {
              charDescription = `姓名：${char.name}\n性别：${char.gender}\n性格：${char.personality}\n背景：${char.background}\n人际关系：${char.relationships}\n备注：${char.notes}`;
            }
            enhancedSystemPrompt += `- ${char.name}：${charDescription}\n`;
          }
        });
      }

      // 添加选中的章节信息
      if (selectedChapters.length > 0) {
        enhancedSystemPrompt += "\n\n参考章节：\n";
        selectedChapters.forEach((chapId) => {
          const chap = chapters.find((c) => c.id === chapId);
          if (chap) {
            enhancedSystemPrompt += `章节 ${chap.order}：${chap.title}\n`;
            if (chapterDetailMode === "summary") {
              if (chap.description) {
                enhancedSystemPrompt += `描述：${chap.description}\n`;
              }
            } else {
              if (chap.content) {
                enhancedSystemPrompt += `内容：${chap.content}\n`;
              }
            }
            enhancedSystemPrompt += "\n";
          }
        });
      }

      // 添加选中的情节信息
      if (selectedPlots.length > 0) {
        enhancedSystemPrompt += "\n\n参考情节：\n";
        selectedPlots.forEach((plotId) => {
          const plot = plots.find((p) => p.id === plotId);
          if (plot) {
            enhancedSystemPrompt += `${plot.title}：${plot.content}\n\n`;
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

          // 检查是否正在思考
          const hasThinkingTag = rawData.includes('<thinking>');
          const hasClosingTag = rawData.includes('</thinking>');
          setIsThinking(hasThinkingTag && !hasClosingTag);

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
      setIsThinking(false);
    }
  };

  const handleApiChange = (apiId: string) => {
    setSelectedApiId(apiId);
    const api = apis.find((a) => a.id === apiId);
    if (api) {
      setSelectedModel(api.selectedModel);
      setEnableThinking(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setEnableThinking(false);
  };

  const toggleCharacter = (charId: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(charId)
        ? prev.filter((id) => id !== charId)
        : [...prev, charId],
    );
  };

  const toggleChapter = (chapId: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapId)
        ? prev.filter((id) => id !== chapId)
        : [...prev, chapId],
    );
  };

  const togglePlot = (plotId: string) => {
    setSelectedPlots((prev) =>
      prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId],
    );
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
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                AI 生成内容预览
                {isThinking && (
                  <span className="flex items-center gap-1 text-sm text-purple-400 animate-pulse">
                    🧠 思考中...
                  </span>
                )}
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
              {previewContent ? (
                <div className="whitespace-pre-wrap wrap-break-word text-slate-300">
                  {(() => {
                    // 使用正则表达式匹配 thinking 标签
                    const thinkingRegex = /<thinking>([\s\S]*?)(<\/thinking>|$)/g;
                    const parts: Array<{ type: 'thinking' | 'normal'; content: string }> = [];
                    let lastIndex = 0;
                    let match;

                    while ((match = thinkingRegex.exec(previewContent)) !== null) {
                      // 添加 thinking 标签之前的正常内容
                      if (match.index > lastIndex) {
                        const normalContent = previewContent.slice(lastIndex, match.index);
                        if (normalContent) {
                          parts.push({ type: 'normal', content: normalContent });
                        }
                      }

                      // 添加 thinking 内容
                      if (match[1]) {
                        parts.push({ type: 'thinking', content: match[1] });
                      }

                      lastIndex = match.index + match[0].length;
                    }

                    // 添加剩余的正常内容
                    if (lastIndex < previewContent.length) {
                      const remainingContent = previewContent.slice(lastIndex);
                      if (remainingContent) {
                        parts.push({ type: 'normal', content: remainingContent });
                      }
                    }

                    return parts.map((part, index) => (
                      <div key={index}>
                        {part.type === 'thinking' ? (
                          <div className="my-3 p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg">
                            <div className="text-xs text-purple-400 mb-2 font-medium">🧠 思考过程</div>
                            <div className="text-sm text-purple-200">{part.content}</div>
                          </div>
                        ) : (
                          <span>{part.content}</span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-slate-400">正在生成...</div>
              )}
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
                <button
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-left text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-500 transition-colors"
                  onClick={() => setShowModelSelectorModal(true)}
                  disabled={isGenerating}
                >
                  {selectedModel
                    ? `🤖 ${selectedModel}`
                    : "选择模型..."}
                </button>
              </>
            )}
          </div>
        )}

        {/* 模型选择器 Modal */}
        <Modal
          isOpen={showModelSelectorModal}
          onClose={() => setShowModelSelectorModal(false)}
          title="选择模型"
          maxWidth="2xl"
          footer={
            <div className="space-y-4">
              {/* 思考设置 */}
              {selectedModel && (() => {
                const model = apis.find(a => a.id === selectedApiId)?.models.find(m => m.name === selectedModel);
                return model?.canThink ? (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          id="enable-thinking-modal"
                          checked={enableThinking}
                          onChange={(e) => setEnableThinking(e.target.checked)}
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
                            onChange={(e) => setThinkingTokens(parseInt(e.target.value))}
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
                ) : null;
              })()}

              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                  onClick={() => setShowModelSelectorModal(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">选择 API</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {apis.map((api) => (
                  <button
                    key={api.id}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedApiId === api.id
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-slate-800 border-slate-700 hover:border-slate-600"
                    }`}
                    onClick={() => {
                      handleApiChange(api.id);
                    }}
                  >
                    <div className="font-medium">{api.name}</div>
                    <div className="text-xs text-slate-400">{api.models.length} 个模型</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedApiId && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">选择模型</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {apis
                    .find((api) => api.id === selectedApiId)
                    ?.models.map((model) => (
                      <button
                        key={model.name}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          selectedModel === model.name
                            ? "bg-blue-600/20 border-blue-500 text-blue-400"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => {
                          handleModelChange(model.name);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{model.name}</div>
                          <div className="flex gap-2">
                            {model.canThink && (
                              <span className="px-2 py-0.5 bg-purple-600/30 text-purple-400 rounded text-xs">
                                🧠 思考
                              </span>
                            )}
                            {model.canUseTools && (
                              <span className="px-2 py-0.5 bg-green-600/30 text-green-400 rounded text-xs">
                                🔧 工具
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          最大令牌: {model.maxTokens}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* 上下文选择器 */}
        {currentNovelId && (characters.length > 0 || chapters.length > 0 || plots.length > 0) && (
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
              selectedChapters.length > 0 ||
              selectedPlots.length > 0) && (
              <div className="text-xs text-green-400 mt-2">
                ✓ 已选择 {selectedCharacters.length} 个人物，
                {selectedChapters.length} 个章节，
                {selectedPlots.length} 个情节
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
            {/* 大 Tab 选择 */}
            <div className="flex border-b border-slate-700">
              <button
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  contextTab === "characters"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
                onClick={() => setContextTab("characters")}
              >
                👤 人物
                {selectedCharacters.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs">
                    {selectedCharacters.length}
                  </span>
                )}
              </button>
              <button
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  contextTab === "chapters"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
                onClick={() => setContextTab("chapters")}
              >
                📖 章节
                {selectedChapters.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs">
                    {selectedChapters.length}
                  </span>
                )}
              </button>
              <button
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  contextTab === "plots"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
                onClick={() => setContextTab("plots")}
              >
                📝 情节
                {selectedPlots.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs">
                    {selectedPlots.length}
                  </span>
                )}
              </button>
            </div>

            {/* 人物 Tab 内容 */}
            {contextTab === "characters" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">显示模式</span>
                  <div className="flex bg-slate-700 rounded-lg p-1">
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        characterDetailMode === "summary"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setCharacterDetailMode("summary")}
                    >
                      📝 摘要
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        characterDetailMode === "full"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setCharacterDetailMode("full")}
                    >
                      📄 全文
                    </button>
                  </div>
                </div>
                {characters.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    暂无人物，请先在资源管理中创建
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {characters.map((char) => (
                      <div
                        key={char.id}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedCharacters.includes(char.id)
                            ? "bg-blue-600/20 border-blue-500"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => toggleCharacter(char.id)}
                      >
                        <div className="font-medium mb-1">{char.name}</div>
                        <div className="text-sm text-slate-400">
                          {char.gender} · {char.personality}
                        </div>
                        {characterDetailMode === "full" && char.background && (
                          <div className="text-xs text-slate-500 mt-2 line-clamp-2">
                            {char.background}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 章节 Tab 内容 */}
            {contextTab === "chapters" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">显示模式</span>
                  <div className="flex bg-slate-700 rounded-lg p-1">
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        chapterDetailMode === "summary"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setChapterDetailMode("summary")}
                    >
                      📝 摘要
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        chapterDetailMode === "full"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setChapterDetailMode("full")}
                    >
                      📄 全文
                    </button>
                  </div>
                </div>
                {chapters.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    暂无章节，请先在编辑器中创建
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {chapters.map((chap) => (
                      <div
                        key={chap.id}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedChapters.includes(chap.id)
                            ? "bg-blue-600/20 border-blue-500"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => toggleChapter(chap.id)}
                      >
                        <div className="font-medium mb-1">
                          #{chap.order} {chap.title}
                        </div>
                        {chapterDetailMode === "summary" && chap.description && (
                          <div className="text-sm text-slate-400 line-clamp-2">
                            {chap.description}
                          </div>
                        )}
                        {chapterDetailMode === "full" && chap.content && (
                          <div className="text-sm text-slate-400 line-clamp-3">
                            {chap.content.substring(0, 200)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 情节 Tab 内容 */}
            {contextTab === "plots" && (
              <div>
                {plots.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    暂无情节，请先在资源管理中创建
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {plots.map((plot) => (
                      <div
                        key={plot.id}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedPlots.includes(plot.id)
                            ? "bg-blue-600/20 border-blue-500"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => togglePlot(plot.id)}
                      >
                        <div className="font-medium mb-1">{plot.title}</div>
                        <div className="text-sm text-slate-400 line-clamp-3">
                          {plot.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

