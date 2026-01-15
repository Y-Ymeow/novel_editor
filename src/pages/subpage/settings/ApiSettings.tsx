import { useState } from 'react'
import type { ApiConfig, ModelConfig, ApiProviderType } from '../../../types'
import { getProviderConfig, fetchModelsFromApi, getProviderTypes } from '../../../utils/apiProvider'

interface ApiSettingsProps {
  apis: ApiConfig[]
  selectedApiId: string | null
  onApisChange: (apis: ApiConfig[]) => void
  onSelectedApiIdChange: (id: string | null) => void
}

export default function ApiSettings({ apis, selectedApiId, onApisChange, onSelectedApiIdChange }: ApiSettingsProps) {
  const [showApiForm, setShowApiForm] = useState(false)
  const [editingApiId, setEditingApiId] = useState<string | null>(null)
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<ModelConfig[]>([])
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [apiFormData, setApiFormData] = useState({
    name: '',
    provider: 'openai' as ApiProviderType,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: [] as ModelConfig[],
    selectedModel: '',
    autoFetchModels: true,
  })

  const handleProviderChange = (providerType: ApiProviderType) => {
    const config = getProviderConfig(providerType)
    
    setApiFormData({
      ...apiFormData,
      provider: providerType,
      baseUrl: config.defaultBaseUrl,
      models: [],
      selectedModel: '',
    })
  }

  const handleFetchModels = async () => {
    if (!apiFormData.apiKey.trim()) {
      alert('请先输入 API Key')
      return
    }

    setIsFetchingModels(true)
    try {
      const models = await fetchModelsFromApi(apiFormData.baseUrl, apiFormData.apiKey, apiFormData.provider)
      setFetchedModels(models)
      setShowModelSelector(true)
    } catch (error) {
      console.error('Failed to fetch models:', error)
      alert('获取模型列表失败，请检查 API Key 和 Base URL')
    } finally {
      setIsFetchingModels(false)
    }
  }

  const handleConfirmModelSelection = () => {
    const selectedModelList = fetchedModels.filter(m => selectedModels.has(m.id))
    const newModels = [...apiFormData.models, ...selectedModelList]
    const newSelectedModel = !apiFormData.selectedModel && selectedModelList.length > 0 
      ? selectedModelList[0].name 
      : apiFormData.selectedModel
    
    setApiFormData({
      ...apiFormData,
      models: newModels,
      selectedModel: newSelectedModel,
    })
    setShowModelSelector(false)
    setSelectedModels(new Set())
    setFetchedModels([])
  }

  const toggleModelSelection = (modelId: string) => {
    const newSelected = new Set(selectedModels)
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId)
    } else {
      newSelected.add(modelId)
    }
    setSelectedModels(newSelected)
  }

  const selectAllModels = () => {
    setSelectedModels(new Set(fetchedModels.map(m => m.id)))
  }

  const deselectAllModels = () => {
    setSelectedModels(new Set())
  }

  const addManualModel = (modelName: string) => {
    // 检查是否已存在
    if (apiFormData.models.some(m => m.name === modelName || m.id === modelName)) {
      alert('该模型已存在')
      return
    }

    const newModel: ModelConfig = {
      id: modelName,
      name: modelName,
      displayName: modelName,
      canThink: false,
      canUseTools: true,
      maxTokens: 8192,
    }

    const newModels = [...apiFormData.models, newModel]
    const newSelectedModel = !apiFormData.selectedModel ? modelName : apiFormData.selectedModel

    setApiFormData({
      ...apiFormData,
      models: newModels,
      selectedModel: newSelectedModel,
    })
  }

  const handleApiSave = () => {
    if (!apiFormData.name.trim()) {
      alert('请输入 API 名称')
      return
    }

    if (apiFormData.models.length === 0) {
      alert('请至少添加一个模型')
      return
    }

    let updatedApis: ApiConfig[]
    if (editingApiId) {
      updatedApis = apis.map(api =>
        api.id === editingApiId
          ? { ...api, ...apiFormData }
          : api
      )
      setEditingApiId(null)
    } else {
      const newApi: ApiConfig = {
        id: Date.now().toString(),
        ...apiFormData,
      }
      updatedApis = [...apis, newApi]
      if (selectedApiId === null) {
        onSelectedApiIdChange(newApi.id)
      }
    }

    onApisChange(updatedApis)
    setShowApiForm(false)
    resetApiForm()
  }

  const handleApiEdit = (api: ApiConfig) => {
    setApiFormData({
      name: api.name,
      provider: api.provider,
      baseUrl: api.baseUrl,
      apiKey: api.apiKey,
      models: api.models,
      selectedModel: api.selectedModel,
      autoFetchModels: api.autoFetchModels,
    })
    setEditingApiId(api.id)
    setShowApiForm(true)
    setShowModelSelector(false)
    setSelectedModels(new Set())
    setFetchedModels([])
  }

  const handleApiDelete = (id: string) => {
    if (confirm('确定要删除这个 API 配置吗？')) {
      const updatedApis = apis.filter(api => api.id !== id)
      onApisChange(updatedApis)
      if (selectedApiId === id) {
        onSelectedApiIdChange(updatedApis.length > 0 ? updatedApis[0].id : null)
      }
    }
  }

  const resetApiForm = () => {
    const defaultProvider = getProviderConfig('openai')
    setApiFormData({
      name: '',
      provider: 'openai',
      baseUrl: defaultProvider.defaultBaseUrl,
      apiKey: '',
      models: [],
      selectedModel: '',
      autoFetchModels: true,
    })
    setShowModelSelector(false)
    setSelectedModels(new Set())
    setFetchedModels([])
  }

  const updateModel = (index: number, field: keyof ModelConfig, value: string | number | boolean) => {
    const newModels = [...apiFormData.models]
    newModels[index] = { ...newModels[index], [field]: value }
    setApiFormData({ ...apiFormData, models: newModels })
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          onClick={() => { 
            setShowApiForm(true); 
            setEditingApiId(null); 
            setShowModelSelector(false); 
            setSelectedModels(new Set()); 
            setFetchedModels([]); 
            resetApiForm() 
          }}
        >
          + 添加 API
        </button>
      </div>

      {showApiForm && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-6 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingApiId ? '编辑 API' : '添加新 API'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">API 提供商</label>
              <select
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiFormData.provider}
                onChange={(e) => handleProviderChange(e.target.value as ApiProviderType)}
              >
                {getProviderTypes().map((type) => {
                  const config = getProviderConfig(type)
                  return (
                    <option key={type} value={type}>{config.name}</option>
                  )
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">名称</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiFormData.name}
                onChange={(e) => setApiFormData({ ...apiFormData, name: e.target.value })}
                placeholder="例如: 我的 OpenAI, 智谱 AI"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiFormData.baseUrl}
                onChange={(e) => setApiFormData({ ...apiFormData, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-slate-500 mt-1">如果使用代理，可以修改此地址</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiFormData.apiKey}
                onChange={(e) => setApiFormData({ ...apiFormData, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoFetchModels"
                checked={apiFormData.autoFetchModels}
                onChange={(e) => setApiFormData({ ...apiFormData, autoFetchModels: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="autoFetchModels" className="text-sm text-slate-300">自动获取模型列表</label>
            </div>

            {/* 模型选择器弹窗 */}
            {showModelSelector && (
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
                <h4 className="text-lg font-semibold mb-4">选择要添加的模型</h4>
                <p className="text-sm text-slate-400 mb-4">
                  💡 提示：某些模型可能价格较高，请根据需要选择。支持思考的模型会显示 🧠 图标。
                </p>
                
                <div className="flex gap-2 mb-4">
                  <button
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    onClick={selectAllModels}
                  >
                    全选
                  </button>
                  <button
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                    onClick={deselectAllModels}
                  >
                    全不选
                  </button>
                  <span className="text-sm text-slate-400 ml-auto">
                    已选择 {selectedModels.size} / {fetchedModels.length} 个模型
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                  {fetchedModels.map((model, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedModels.has(model.id)
                          ? 'bg-blue-900/30 border-blue-600'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => toggleModelSelection(model.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedModels.has(model.id)}
                          onChange={() => toggleModelSelection(model.id)}
                          className="mt-1 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {model.displayName || model.name}
                            {model.canThink && ' 🧠'}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{model.id}</div>
                          <div className="flex gap-4 mt-2 text-xs text-slate-400">
                            <span>最大 Token: {model.maxTokens.toLocaleString()}</span>
                            <span>{model.canUseTools ? '✓ 支持工具' : '✗ 不支持工具'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => {
                      setShowModelSelector(false)
                      setSelectedModels(new Set())
                      setFetchedModels([])
                    }}
                  >
                    取消
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    onClick={handleConfirmModelSelection}
                    disabled={selectedModels.size === 0}
                  >
                    添加 {selectedModels.size} 个模型
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">模型配置</label>
                {apiFormData.autoFetchModels && (
                  <button
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !apiFormData.apiKey.trim()}
                  >
                    {isFetchingModels ? '获取中...' : '获取模型列表'}
                  </button>
                )}
              </div>

              {/* 手动添加模型 */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">手动添加模型</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入模型名称，如 gpt-4-turbo"
                    id="manualModelInput"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = document.getElementById('manualModelInput') as HTMLInputElement
                        if (input?.value.trim()) {
                          addManualModel(input.value.trim())
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <button
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => {
                      const input = document.getElementById('manualModelInput') as HTMLInputElement
                      if (input?.value.trim()) {
                        addManualModel(input.value.trim())
                        input.value = ''
                      }
                    }}
                  >
                    添加
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  💡 提示：某些模型可能不会出现在 API 返回的列表中，可以手动添加。
                </p>
              </div>

              {apiFormData.models.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-slate-400 w-20">默认模型</label>
                    <select
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={apiFormData.selectedModel}
                      onChange={(e) => setApiFormData({ ...apiFormData, selectedModel: e.target.value })}
                    >
                      {apiFormData.models.map((model, index) => (
                        <option key={index} value={model.name}>
                          {model.displayName || model.name}
                          {model.canThink && ' 🧠'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {apiFormData.models.map((model, index) => (
                      <div key={index} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{model.displayName || model.name}</span>
                            <span className="text-xs text-slate-500 ml-2">{model.id}</span>
                          </div>
                          <button
                            className="text-red-400 hover:text-red-300 text-sm"
                            onClick={() => {
                              const newModels = apiFormData.models.filter((_, i) => i !== index)
                              const newSelectedModel = apiFormData.selectedModel === model.name
                                ? (newModels.length > 0 ? newModels[0].name : '')
                                : apiFormData.selectedModel
                              setApiFormData({ ...apiFormData, models: newModels, selectedModel: newSelectedModel })
                            }}
                          >
                            删除
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <label className="flex items-center gap-2 text-slate-300">
                            <input
                              type="checkbox"
                              checked={model.canThink}
                              onChange={(e) => updateModel(index, 'canThink', e.target.checked)}
                              className="rounded"
                            />
                            支持思考
                          </label>
                          <label className="flex items-center gap-2 text-slate-300">
                            <input
                              type="checkbox"
                              checked={model.canUseTools}
                              onChange={(e) => updateModel(index, 'canUseTools', e.target.checked)}
                              className="rounded"
                            />
                            支持工具
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">最大:</span>
                            <input
                              type="number"
                              className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none"
                              value={model.maxTokens}
                              onChange={(e) => updateModel(index, 'maxTokens', parseInt(e.target.value) || 8192)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors" onClick={handleApiSave}>保存</button>
              <button
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                onClick={() => { setShowApiForm(false); setEditingApiId(null); resetApiForm() }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold">API 配置列表</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {apis.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              暂无 API 配置，请添加
            </div>
          ) : (
            apis.map((api) => {
              const providerConfig = getProviderConfig(api.provider)
              return (
                <div
                  key={api.id}
                  className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                    selectedApiId === api.id ? 'bg-green-900/30' : 'hover:bg-slate-700/50'
                  }`}
                  onClick={() => onSelectedApiIdChange(api.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{api.name}</span>
                      <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs">{providerConfig.name}</span>
                    </div>
                    <div className="text-sm text-slate-400">{api.baseUrl}</div>
                    <div className="mt-1 flex gap-2 flex-wrap">
                      {api.models.slice(0, 5).map((model, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                          {model.displayName || model.name}
                          {model.canThink && ' 🧠'}
                        </span>
                      ))}
                      {api.models.length > 5 && (
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">+{api.models.length - 5} 更多</span>
                      )}
                      {selectedApiId === api.id && <span className="px-2 py-0.5 bg-green-600 rounded text-xs">当前使用</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 rounded-lg text-sm font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleApiEdit(api) }}
                    >
                      编辑
                    </button>
                    <button
                      className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleApiDelete(api.id) }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}