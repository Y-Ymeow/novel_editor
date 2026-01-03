import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ApiConfig, DatabaseConfig } from '../types'
import { DEFAULT_PROMPTS } from '../types'
import { storage } from '../utils/storage'
import ApiSettings from './subpage/settings/ApiSettings'
import DatabaseSettings from './subpage/settings/DatabaseSettings'
import BackupSettings from './subpage/settings/BackupSettings'
import PromptSettings from './subpage/settings/PromptSettings'

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'api' | 'database' | 'backup' | 'prompt'>('api')

  const [apis, setApis] = useState<ApiConfig[]>([])
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null)

  const [databases, setDatabases] = useState<DatabaseConfig[]>([])
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null)
  const [storageType, setStorageType] = useState<'localStorage' | 'indexedDB' | 'mongodb'>('localStorage')

  useEffect(() => {
    const settings = storage.getSettings()
    setApis(settings.apis)
    setSelectedApiId(settings.selectedApiId || (settings.apis.length > 0 ? settings.apis[0].id : null))
    setDatabases(settings.databases || [])
    setSelectedDatabaseId(settings.selectedDatabaseId || null)
    setStorageType(settings.storageType || 'localStorage')
  }, [])

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
      prompts: DEFAULT_PROMPTS,
    })
    alert('设置已保存')
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
            <ApiSettings
              apis={apis}
              selectedApiId={selectedApiId}
              onApisChange={setApis}
              onSelectedApiIdChange={setSelectedApiId}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseSettings
              databases={databases}
              selectedDatabaseId={selectedDatabaseId}
              storageType={storageType}
              onDatabasesChange={setDatabases}
              onSelectedDatabaseIdChange={setSelectedDatabaseId}
              onStorageTypeChange={setStorageType}
            />
          )}

          {activeTab === 'backup' && <BackupSettings />}

          {activeTab === 'prompt' && <PromptSettings />}

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