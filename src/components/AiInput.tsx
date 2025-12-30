import { useState, useEffect } from 'react'
import { storage } from '../utils/storage'
import { callOpenAIStream } from '../utils/api'
import { getCharacters, getChapters } from '../utils/storageWrapper'
import type { ApiConfig, ModelConfig, Character, Chapter } from '../types'

interface AiInputProps {
  onGenerate: (content: string) => void
  onStreaming?: (content: string) => void
  placeholder?: string
  buttonText?: string
  showModelSelector?: boolean
  systemPrompt?: string
  className?: string
  currentNovelId?: string | null
}

export default function AiInput({ 
  onGenerate, 
  onStreaming,
  placeholder = '输入提示...', 
  buttonText = '生成',
  showModelSelector = true,
  systemPrompt,
  className = '',
  currentNovelId
}: AiInputProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [apis, setApis] = useState<ApiConfig[]>([])
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [enableThinking, setEnableThinking] = useState(false)
  const [thinkingTokens, setThinkingTokens] = useState(1000)
  const [currentModelConfig, setCurrentModelConfig] = useState<ModelConfig | null>(null)
  
  const [characters, setCharacters] = useState<Character[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [showContextSelector, setShowContextSelector] = useState(false)
  const [chapterTab, setChapterTab] = useState<'content' | 'description'>('content')
  const [selectedChapterContents, setSelectedChapterContents] = useState<string[]>([])
  const [selectedChapterDescriptions, setSelectedChapterDescriptions] = useState<string[]>([])

  useEffect(() => {
    const settings = storage.getSettings()
    setApis(settings.apis)
    setSelectedApiId(settings.selectedApiId || (settings.apis.length > 0 ? settings.apis[0].id : null))
    
    if (settings.selectedApiId) {
      const selectedApi = settings.apis.find(api => api.id === settings.selectedApiId)
      if (selectedApi) {
        setSelectedModel(selectedApi.selectedModel)
        const modelConfig = selectedApi.models.find(m => m.name === selectedApi.selectedModel)
        setCurrentModelConfig(modelConfig || null)
      }
    }
  }, [])

  useEffect(() => {
    if (currentNovelId) {
      loadCharacters(currentNovelId)
      loadChapters(currentNovelId)
    }
  }, [currentNovelId])

  const loadCharacters = async (novelId: string) => {
    const loaded = await getCharacters(novelId)
    setCharacters(loaded)
  }

  const loadChapters = async (novelId: string) => {
    const loaded = await getChapters(novelId)
    setChapters(loaded)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入提示')
      return
    }

    if (!selectedApiId) {
      alert('请先在设置中配置 API')
      return
    }

    setIsGenerating(true)
    let fullContent = ''
    
    try {
      const selectedApi = apis.find(api => api.id === selectedApiId)
      if (!selectedApi) {
        throw new Error('未找到 API 配置')
      }

      const modelConfig = selectedApi.models.find(m => m.name === selectedModel)
      if (!modelConfig) {
        throw new Error('未找到模型配置')
      }

      // 构建增强的 system prompt
      let enhancedSystemPrompt = systemPrompt || ''
      
      // 添加选中的人物信息
      if (selectedCharacters.length > 0) {
        enhancedSystemPrompt += '\n\n参考人物信息：\n'
        selectedCharacters.forEach(charId => {
          const char = characters.find(c => c.id === charId)
          if (char) {
            enhancedSystemPrompt += `- ${char.name}：${char.personality || char.background || '暂无描述'}\n`
          }
        })
      }
      
      // 添加选中的章节信息
      if (selectedChapterContents.length > 0) {
        enhancedSystemPrompt += '\n\n参考章节正文：\n'
        selectedChapterContents.forEach(chapId => {
          const chap = chapters.find(c => c.id === chapId)
          if (chap) {
            enhancedSystemPrompt += `章节 ${chap.order}：${chap.title}\n内容：${chap.content.slice(-500)}...\n`
          }
        })
      }
      if (selectedChapterDescriptions.length > 0) {
        enhancedSystemPrompt += '\n\n参考章节描述：\n'
        selectedChapterDescriptions.forEach(chapId => {
          const chap = chapters.find(c => c.id === chapId)
          if (chap && chap.description) {
            enhancedSystemPrompt += `章节 ${chap.order}：${chap.title}\n描述：${chap.description}\n`
          }
        })
      }

      await callOpenAIStream(
        prompt, 
        enhancedSystemPrompt, 
        selectedModel, 
        selectedApi,
        enableThinking ? thinkingTokens : 0,
        (chunk) => {
          fullContent += chunk
          if (onStreaming) {
            onStreaming(fullContent)
          }
        }
      )

      onGenerate(fullContent)
      setPrompt('')
    } catch (error) {
      alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApiChange = (apiId: string) => {
    setSelectedApiId(apiId)
    const api = apis.find(a => a.id === apiId)
    if (api) {
      setSelectedModel(api.selectedModel)
      const modelConfig = api.models.find(m => m.name === api.selectedModel)
      setCurrentModelConfig(modelConfig || null)
      setEnableThinking(false)
    }
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    const api = apis.find(a => a.id === selectedApiId)
    if (api) {
      const modelConfig = api.models.find(m => m.name === model)
      setCurrentModelConfig(modelConfig || null)
      setEnableThinking(false)
    }
  }

  const toggleCharacter = (charId: string) => {
    setSelectedCharacters(prev => 
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    )
  }

  const toggleChapter = (chapId: string) => {
    if (chapterTab === 'content') {
      setSelectedChapterContents(prev => 
        prev.includes(chapId) ? prev.filter(id => id !== chapId) : [...prev, chapId]
      )
    } else {
      setSelectedChapterDescriptions(prev => 
        prev.includes(chapId) ? prev.filter(id => id !== chapId) : [...prev, chapId]
      )
    }
  }

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${className}`}>
      <div className="space-y-3">
        {showModelSelector && (
          <div className="space-y-2">
            {apis.length === 0 ? (
              <div className="text-sm text-slate-500">请在设置中配置 API 和模型</div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 whitespace-nowrap">API:</label>
                  <select
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedApiId || ''}
                    onChange={(e) => handleApiChange(e.target.value)}
                    disabled={isGenerating}
                  >
                    {apis.map(api => (
                      <option key={api.id} value={api.id}>{api.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 whitespace-nowrap">模型:</label>
                  {selectedApiId ? (
                    <select
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={isGenerating}
                    >
                      {apis.find(api => api.id === selectedApiId)?.models.map(model => (
                        <option key={model.name} value={model.name}>
                          {model.name}
                          {model.canThink && ' 🧠'}
                          {model.canUseTools && ' 🔧'}
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
                        {enableThinking ? '⚠️ 费用较高' : '💰 节省费用'}
                      </span>
                    </div>
                    {enableThinking && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">思考额度:</label>
                          <input
                            type="range"
                            min="100"
                            max="10000"
                            step="100"
                            value={thinkingTokens}
                            onChange={(e) => setThinkingTokens(parseInt(e.target.value))}
                            disabled={isGenerating}
                            className="flex-1"
                          />
                          <span className="text-xs text-slate-300 w-16 text-right">{thinkingTokens}</span>
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
                📚 添加上下文参考 <span className="text-slate-500 font-normal">（人物/章节）</span>
              </span>
              <span className="text-slate-400">▶</span>
            </button>
            {(selectedCharacters.length > 0 || selectedChapterContents.length > 0 || selectedChapterDescriptions.length > 0) && (
              <div className="text-xs text-green-400 mt-2">
                ✓ 已选择 {selectedCharacters.length} 个人物，{selectedChapterContents.length} 个章节正文，{selectedChapterDescriptions.length} 个章节描述
              </div>
            )}
          </div>
        )}

        {/* 上下文选择器 Modal */}
        {showContextSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">添加上下文参考</h3>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {characters.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">选择人物：</label>
                    <div className="flex flex-wrap gap-2">
                      {characters.map(char => (
                        <button
                          key={char.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedCharacters.includes(char.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                    <label className="text-sm font-medium text-slate-300 block mb-2">选择章节：</label>
                    <div className="mb-3 bg-slate-700 rounded-lg p-1 inline-flex">
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          chapterTab === 'content'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                        onClick={() => setChapterTab('content')}
                      >
                        📄 正文
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          chapterTab === 'description'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                        onClick={() => setChapterTab('description')}
                      >
                        📝 描述
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chapters.map(chap => (
                        <button
                          key={chap.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            chapterTab === 'content' && selectedChapterContents.includes(chap.id)
                              ? 'bg-purple-600 text-white'
                              : chapterTab === 'description' && selectedChapterDescriptions.includes(chap.id)
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
              <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                <button 
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                  onClick={() => setShowContextSelector(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

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
          {isGenerating ? '生成中...' : buttonText}
        </button>
      </div>
    </div>
  )
}
