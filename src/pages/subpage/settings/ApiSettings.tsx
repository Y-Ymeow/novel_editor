import { useState } from 'react'
import type { ApiConfig, ModelConfig } from '../../../types'

interface ApiSettingsProps {
  apis: ApiConfig[]
  selectedApiId: string | null
  onApisChange: (apis: ApiConfig[]) => void
  onSelectedApiIdChange: (id: string | null) => void
}

export default function ApiSettings({ apis, selectedApiId, onApisChange, onSelectedApiIdChange }: ApiSettingsProps) {
  const [showApiForm, setShowApiForm] = useState(false)
  const [editingApiId, setEditingApiId] = useState<string | null>(null)
  const [apiFormData, setApiFormData] = useState({
    name: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: [] as ModelConfig[],
    selectedModel: '',
  })
  const [newModelInput, setNewModelInput] = useState('')

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
      baseUrl: api.baseUrl,
      apiKey: api.apiKey,
      models: api.models,
      selectedModel: api.selectedModel,
    })
    setEditingApiId(api.id)
    setShowApiForm(true)
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
    setApiFormData({
      name: '',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      models: [],
      selectedModel: '',
    })
    setNewModelInput('')
  }

  const addModel = () => {
    if (!newModelInput.trim()) return
    const model: ModelConfig = {
      name: newModelInput.trim(),
      canThink: false,
      canUseTools: false,
      maxTokens: 2000,
    }
    const newModels = [...apiFormData.models, model]
    const newSelectedModel = !apiFormData.selectedModel ? model.name : apiFormData.selectedModel
    setApiFormData({ ...apiFormData, models: newModels, selectedModel: newSelectedModel })
    setNewModelInput('')
  }

  const removeModel = (index: number) => {
    const newModels = apiFormData.models.filter((_, i) => i !== index)
    const newSelectedModel = apiFormData.selectedModel === apiFormData.models[index].name
      ? (newModels.length > 0 ? newModels[0].name : '')
      : apiFormData.selectedModel
    setApiFormData({ ...apiFormData, models: newModels, selectedModel: newSelectedModel })
  }

  const updateModel = (index: number, field: keyof ModelConfig, value: string | number | boolean | object | null | undefined) => {
    const newModels = [...apiFormData.models]
    newModels[index] = { ...newModels[index], [field]: value }
    setApiFormData({ ...apiFormData, models: newModels })
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          onClick={() => { setShowApiForm(true); setEditingApiId(null); resetApiForm() }}
        >
          + 添加 API
        </button>
      </div>

      {showApiForm && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-6 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingApiId ? '编辑 API' : '添加新 API'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">名称</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiFormData.name}
                onChange={(e) => setApiFormData({ ...apiFormData, name: e.target.value })}
                placeholder="例如: OpenAI, Claude, 智谱"
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">模型配置</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newModelInput}
                    onChange={(e) => setNewModelInput(e.target.value)}
                    placeholder="模型名称，如 gpt-4"
                    onKeyPress={(e) => e.key === 'Enter' && addModel()}
                  />
                  <button
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    onClick={addModel}
                  >
                    添加
                  </button>
                </div>

                {apiFormData.models.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-slate-400 w-20">默认模型</label>
                      <select
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={apiFormData.selectedModel}
                        onChange={(e) => setApiFormData({ ...apiFormData, selectedModel: e.target.value })}
                      >
                        {apiFormData.models.map((model, index) => (
                          <option key={index} value={model.name}>{model.name}</option>
                        ))}
                      </select>
                    </div>

                    {apiFormData.models.map((model, index) => (
                      <div key={index} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{model.name}</span>
                          <button
                            className="text-red-400 hover:text-red-300 text-sm"
                            onClick={() => removeModel(index)}
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
                              onChange={(e) => updateModel(index, 'maxTokens', parseInt(e.target.value) || 2000)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
            apis.map((api) => (
              <div
                key={api.id}
                className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                  selectedApiId === api.id ? 'bg-green-900/30' : 'hover:bg-slate-700/50'
                }`}
                onClick={() => onSelectedApiIdChange(api.id)}
              >
                <div>
                  <div className="font-semibold">{api.name}</div>
                  <div className="text-sm text-slate-400">{api.baseUrl}</div>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {api.models.map((model, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                        {model.name}
                        {model.canThink && ' 🧠'}
                        {model.canUseTools && ' 🔧'}
                      </span>
                    ))}
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
            ))
          )}
        </div>
      </div>
    </>
  )
}