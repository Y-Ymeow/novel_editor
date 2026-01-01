import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ApiConfig, DatabaseConfig, ModelConfig, PromptConfig } from '../types'
import { DEFAULT_PROMPTS } from '../types'
import { storage } from '../utils/storage'
import { testDatabaseConnection, getConnectionStringPlaceholder } from '../utils/database'
import { downloadBackup, importBackup } from '../utils/storageWrapper'
import * as promptManager from '../utils/promptManager'

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'api' | 'database' | 'backup' | 'prompt'>('api')

  const [apis, setApis] = useState<ApiConfig[]>([])
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null)
  const [showApiForm, setShowApiForm] = useState(false)
  const [editingApiId, setEditingApiId] = useState<string | null>(null)

  const [databases, setDatabases] = useState<DatabaseConfig[]>([])
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null)
  const [storageType, setStorageType] = useState<'localStorage' | 'indexedDB' | 'mongodb'>('localStorage')
  const [showDbForm, setShowDbForm] = useState(false)
  const [editingDbId, setEditingDbId] = useState<string | null>(null)
  const [testingDb, setTestingDb] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [importing, setImporting] = useState(false)

  const [apiFormData, setApiFormData] = useState({
    name: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: [] as ModelConfig[],
    selectedModel: '',
  })

  const [dbFormData, setDbFormData] = useState({
    name: '',
    connectionString: '',
  })

  const [newModelInput, setNewModelInput] = useState('')

  const [editedPrompts, setEditedPrompts] = useState<PromptConfig>(DEFAULT_PROMPTS)

  useEffect(() => {
    const settings = storage.getSettings()
    setApis(settings.apis)
    setSelectedApiId(settings.selectedApiId || (settings.apis.length > 0 ? settings.apis[0].id : null))
    setDatabases(settings.databases || [])
    setSelectedDatabaseId(settings.selectedDatabaseId || null)
    setStorageType(settings.storageType || 'localStorage')
    setEditedPrompts(settings.prompts || DEFAULT_PROMPTS)
  }, [])

  const handleApiSave = () => {
    if (!apiFormData.name.trim()) {
      alert('请输入 API 名称')
      return
    }

    if (apiFormData.models.length === 0) {
      alert('请至少添加一个模型')
      return
    }

    if (editingApiId) {
      setApis(apis.map(api =>
        api.id === editingApiId
          ? { ...api, ...apiFormData }
          : api
      ))
      setEditingApiId(null)
    } else {
      const newApi: ApiConfig = {
        id: Date.now().toString(),
        ...apiFormData,
      }
      const updatedApis = [...apis, newApi]
      setApis(updatedApis)
      // 如果这是第一个 API，自动选中它
      if (selectedApiId === null) {
        setSelectedApiId(newApi.id)
      }
    }

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
      setApis(updatedApis)
      if (selectedApiId === id) {
        setSelectedApiId(updatedApis.length > 0 ? updatedApis[0].id : null)
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
    setApiFormData({ ...apiFormData, models: [...apiFormData.models, model] })
    if (!apiFormData.selectedModel) {
      setApiFormData({ ...apiFormData, models: [...apiFormData.models, model], selectedModel: model.name })
    }
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

  const handleDbSave = async () => {
    if (editingDbId) {
      setDatabases(databases.map(db =>
        db.id === editingDbId
          ? { ...db, ...dbFormData, type: 'mongodb' }
          : db
      ))
      setEditingDbId(null)
    } else {
      const newDb: DatabaseConfig = {
        id: Date.now().toString(),
        name: dbFormData.name,
        type: 'mongodb',
        connectionString: dbFormData.connectionString,
        enabled: true,
      }
      setDatabases([...databases, newDb])
    }

    setShowDbForm(false)
    resetDbForm()
  }

  const handleDbEdit = (db: DatabaseConfig) => {
    setDbFormData({
      name: db.name,
      connectionString: db.connectionString,
    })
    setEditingDbId(db.id)
    setShowDbForm(true)
  }

  const handleDbDelete = (id: string) => {
    if (confirm('确定要删除这个数据库配置吗？')) {
      setDatabases(databases.filter(db => db.id !== id))
      if (selectedDatabaseId === id) {
        setSelectedDatabaseId(null)
      }
    }
  }

  const handleTestConnection = async (db: DatabaseConfig) => {
    setTestingDb(db.id)
    setTestResult(null)
    const result = await testDatabaseConnection(db)
    setTestResult({ id: db.id, ...result })
    setTestingDb(null)
  }

  const resetDbForm = () => {
    setDbFormData({
      name: '',
      connectionString: '',
    })
  }

  const saveSettings = () => {
    storage.saveSettings({
      apis,
      selectedApiId,
      databases,
      selectedDatabaseId,
      useLocalStorage: storageType === 'localStorage',
      useIndexedDB: storageType === 'indexedDB',
      storageType,
      selectedNovelId: null,
      prompts: editedPrompts,
    })
    alert('设置已保存')
  }

  const handleExport = () => {
    downloadBackup()
  }

  const handleExportSettings = () => {
    const settings = storage.getSettings()
    const settingsBackup = {
      version: '1.0',
      timestamp: Date.now(),
      type: 'settings',
      data: {
        apis: settings.apis,
        selectedApiId: settings.selectedApiId,
        databases: settings.databases,
        selectedDatabaseId: settings.selectedDatabaseId,
        storageType: settings.storageType,
        prompts: settings.prompts,
      }
    }

    const blob = new Blob([JSON.stringify(settingsBackup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-novel-settings-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      if (backup.type !== 'settings') {
        alert('这不是系统设置备份文件')
        return
      }

      if (confirm('导入系统设置会覆盖当前的 API 配置、数据库配置和 Prompt 设置，确定要继续吗？')) {
        const settings = storage.getSettings()
        settings.apis = backup.data.apis || []
        settings.selectedApiId = backup.data.selectedApiId || null
        settings.databases = backup.data.databases || []
        settings.selectedDatabaseId = backup.data.selectedDatabaseId || null
        settings.storageType = backup.data.storageType || 'localStorage'
        settings.prompts = backup.data.prompts || undefined

        storage.saveSettings(settings)

        // 刷新页面状态
        setApis(settings.apis)
        setSelectedApiId(settings.selectedApiId)
        setDatabases(settings.databases)
        setSelectedDatabaseId(settings.selectedDatabaseId)
        setStorageType(settings.storageType)
        setEditedPrompts(settings.prompts || promptManager.getPrompts())

        alert('系统设置导入成功')
      }
    } catch (error) {
      console.error(error)
      alert('导入失败：文件格式错误')
    }

    // 清空文件选择
    event.target.value = ''
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      await importBackup(text)
      alert('备份导入成功')
    } catch (error) {
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">⚙️ 设置</h1>
          <button
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            onClick={() => navigate(-1)}
          >
            ← 返回
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'api'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => setActiveTab('api')}
            >
              🤖 API 配置
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'database'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => setActiveTab('database')}
            >
              🗄️ 数据库配置
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => setActiveTab('backup')}
            >
              💾 备份与恢复
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'prompt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => setActiveTab('prompt')}
            >
              ✨ Prompt 配置
            </button>
          </div>

          {activeTab === 'api' && (
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
                        onClick={() => setSelectedApiId(api.id)}
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
          )}

          {activeTab === 'database' && (
            <>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">数据存储方式</h3>
                    <p className="text-sm text-slate-400">选择数据存储方式</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        storageType === 'localStorage'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      onClick={() => setStorageType('localStorage')}
                    >
                      📱 LocalStorage
                    </button>
                    <button
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        storageType === 'indexedDB'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      onClick={() => setStorageType('indexedDB')}
                    >
                      🗃️ IndexedDB
                    </button>
                    <button
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        storageType === 'mongodb'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      onClick={() => setStorageType('mongodb')}
                    >
                      🍃 MongoDB
                    </button>
                  </div>
                </div>
              </div>

              {storageType === 'mongodb' && (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                      onClick={() => { setShowDbForm(true); setEditingDbId(null); resetDbForm() }}
                    >
                      + 添加 MongoDB
                    </button>
                  </div>

                  {showDbForm && (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-6 p-6">
                      <h3 className="text-lg font-semibold mb-4">{editingDbId ? '编辑 MongoDB' : '添加 MongoDB'}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">名称</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={dbFormData.name}
                            onChange={(e) => setDbFormData({ ...dbFormData, name: e.target.value })}
                            placeholder="例如: MongoDB Atlas"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">连接字符串</label>
                          <textarea
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                            rows={3}
                            value={dbFormData.connectionString}
                            onChange={(e) => setDbFormData({ ...dbFormData, connectionString: e.target.value })}
                            placeholder={getConnectionStringPlaceholder()}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors" onClick={handleDbSave}>保存</button>
                          <button
                            className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                            onClick={() => { setShowDbForm(false); setEditingDbId(null); resetDbForm() }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                      <h3 className="text-lg font-semibold">MongoDB 配置列表</h3>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {databases.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          暂无 MongoDB 配置，请添加
                        </div>
                      ) : (
                        databases.map((db) => (
                          <div key={db.id} className={`p-4 transition-colors ${selectedDatabaseId === db.id ? 'bg-green-900/30' : 'hover:bg-slate-700/50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">🍃</span>
                                <div>
                                  <div className="font-semibold">{db.name}</div>
                                  <div className="text-sm text-slate-400">MongoDB</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1.5 border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded-lg text-sm font-medium transition-colors"
                                  onClick={() => handleTestConnection(db)}
                                  disabled={testingDb === db.id}
                                >
                                  {testingDb === db.id ? '测试中...' : '🔗 测试连接'}
                                </button>
                                <button
                                  className="px-3 py-1.5 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 rounded-lg text-sm font-medium transition-colors"
                                  onClick={() => handleDbEdit(db)}
                                >
                                  编辑
                                </button>
                                <button
                                  className="px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                                  onClick={() => handleDbDelete(db.id)}
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                            {testResult?.id === db.id && (
                              <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                {testResult.message}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {storageType !== 'mongodb' && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
                  <div className="text-4xl mb-4">{storageType === 'localStorage' ? '📱' : '🗃️'}</div>
                  <h3 className="text-xl font-semibold mb-2">使用 {storageType === 'localStorage' ? 'LocalStorage' : 'IndexedDB'}</h3>
                  <p className="text-slate-400">
                    {storageType === 'localStorage'
                      ? '数据将存储在浏览器本地，容量约 5-10MB'
                      : '数据将存储在浏览器 IndexedDB，容量更大更稳定'}
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">📤 导出小说数据备份</h3>
                <p className="text-slate-400 mb-4">将所有小说、人物和章节数据导出为 JSON 文件</p>
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                  onClick={handleExport}
                >
                  📥 下载小说数据备份
                </button>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">📥 导入小说数据备份</h3>
                <p className="text-slate-400 mb-4">从 JSON 文件恢复小说数据（会覆盖当前所有小说数据）</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="mb-4 block w-full text-sm text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    file:disabled:opacity-50 file:disabled:cursor-not-allowed"
                />
                {importing && <div className="text-blue-400">正在导入...</div>}
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">⚙️ 导出系统设置备份</h3>
                <p className="text-slate-400 mb-4">导出 API 配置、数据库配置和 Prompt 设置</p>
                <button
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                  onClick={handleExportSettings}
                >
                  📥 下载系统设置备份
                </button>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">🔧 导入系统设置备份</h3>
                <p className="text-slate-400 mb-4">从 JSON 文件恢复系统设置（会覆盖当前 API 配置、数据库配置和 Prompt 设置）</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="mb-4 block w-full text-sm text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-600 file:text-white
                    hover:file:bg-purple-700"
                />
              </div>

              <div className="bg-yellow-900/20 border border-yellow-600 rounded-2xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">⚠️ 注意事项</h4>
                <ul className="text-sm text-yellow-200 space-y-1">
                  <li>• 小说数据备份包含所有小说、人物和章节数据</li>
                  <li>• 系统设置备份包含 API 配置、数据库配置和 Prompt 设置</li>
                  <li>• 导入备份会覆盖当前对应的数据，请谨慎操作</li>
                  <li>• 建议在导入前先导出当前数据作为备份</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">📝 生成章节正文 Prompt</h3>
                <p className="text-slate-400 mb-4">用于 AI 生成小说章节正文的提示词模板</p>
                <textarea
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                  rows={15}
                  value={editedPrompts.generateContent}
                  onChange={(e) => setEditedPrompts({ ...editedPrompts, generateContent: e.target.value })}
                  placeholder="输入生成章节正文的 prompt 模板..."
                />
                <div className="mt-2 text-xs text-slate-500">
                  可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{characters}'}、{'{chapterTitle}'}、{'{chapterDescription}'}、{'{existingContent}'}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">📋 生成章节描述 Prompt</h3>
                <p className="text-slate-400 mb-4">用于 AI 生成章节描述的提示词模板</p>
                <textarea
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                  rows={15}
                  value={editedPrompts.generateDescription}
                  onChange={(e) => setEditedPrompts({ ...editedPrompts, generateDescription: e.target.value })}
                  placeholder="输入生成章节描述的 prompt 模板..."
                />
                <div className="mt-2 text-xs text-slate-500">
                  可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{chapterTitle}'}、{'{previousChapterTitle}'}、{'{previousChapterDescription}'}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">👤 生成人物 Prompt</h3>
                <p className="text-slate-400 mb-4">用于 AI 生成人物设定的提示词模板</p>
                <textarea
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                  rows={15}
                  value={editedPrompts.generateCharacter}
                  onChange={(e) => setEditedPrompts({ ...editedPrompts, generateCharacter: e.target.value })}
                  placeholder="输入生成人物设定的 prompt 模板..."
                />
                <div className="mt-2 text-xs text-slate-500">
                  可用占位符：{'{novelTitle}'}、{'{novelDescription}'}、{'{input}'}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">📖 生成小说描述 Prompt</h3>
                <p className="text-slate-400 mb-4">用于 AI 生成小说描述/简介的提示词模板</p>
                <textarea
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                  rows={15}
                  value={editedPrompts.generateNovelDescription}
                  onChange={(e) => setEditedPrompts({ ...editedPrompts, generateNovelDescription: e.target.value })}
                  placeholder="输入生成小说描述的 prompt 模板..."
                />
                <div className="mt-2 text-xs text-slate-500">
                  可用占位符：{'{input}'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                  onClick={() => {
                    const settings = storage.getSettings()
                    settings.prompts = editedPrompts
                    storage.saveSettings(settings)
                    alert('Prompt 配置已保存')
                  }}
                >
                  💾 保存配置
                </button>
                <button
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                  onClick={() => {
                    if (confirm('确定要恢复默认 Prompt 配置吗？')) {
                      setEditedPrompts(DEFAULT_PROMPTS)
                    }
                  }}
                >
                  🔄 恢复默认
                </button>
              </div>

              <div className="bg-blue-900/20 border border-blue-600 rounded-2xl p-4">
                <h4 className="font-semibold text-blue-400 mb-2">💡 提示</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• 使用占位符可以动态插入小说、人物、章节等信息</li>
                  <li>• 修改 Prompt 后需要点击"保存配置"才能生效</li>
                  <li>• 如果不满意可以点击"恢复默认"回到初始配置</li>
                </ul>
              </div>
            </div>
          )}

          {(apis.length > 0 || databases.length > 0 || storageType) && (
            <div className="mt-6 text-center">
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors" onClick={saveSettings}>
                💾 保存所有设置
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
