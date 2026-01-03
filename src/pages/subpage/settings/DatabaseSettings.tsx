import { useState } from 'react'
import type { DatabaseConfig } from '../../../types'

interface DatabaseSettingsProps {
  databases: DatabaseConfig[]
  selectedDatabaseId: string | null
  storageType: 'localStorage' | 'indexedDB' | 'mongodb'
  onDatabasesChange: (databases: DatabaseConfig[]) => void
  onSelectedDatabaseIdChange: (id: string | null) => void
  onStorageTypeChange: (type: 'localStorage' | 'indexedDB' | 'mongodb') => void
}

export default function DatabaseSettings({
  databases,
  selectedDatabaseId,
  storageType,
  onDatabasesChange,
  onSelectedDatabaseIdChange,
  onStorageTypeChange
}: DatabaseSettingsProps) {
  const [showDbForm, setShowDbForm] = useState(false)
  const [editingDbId, setEditingDbId] = useState<string | null>(null)
  const [testingDb, setTestingDb] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [dbFormData, setDbFormData] = useState({
    name: '',
    connectionString: '',
  })

  const handleDbSave = async () => {
    let updatedDatabases: DatabaseConfig[]
    if (editingDbId) {
      updatedDatabases = databases.map(db =>
        db.id === editingDbId
          ? { ...db, ...dbFormData, type: 'mongodb' }
          : db
      )
      setEditingDbId(null)
    } else {
      const newDb: DatabaseConfig = {
        id: Date.now().toString(),
        name: dbFormData.name,
        type: 'mongodb',
        connectionString: dbFormData.connectionString,
        enabled: true,
      }
      updatedDatabases = [...databases, newDb]
    }

    onDatabasesChange(updatedDatabases)
    setShowDbForm(false)
    resetDbForm()
  }

  const handleDbEdit = (db: DatabaseConfig) => {
    setDbFormData({
      name: db.name,
      connectionString: db.connectionString || '',
    })
    setEditingDbId(db.id)
    setShowDbForm(true)
  }

  const handleDbDelete = (id: string) => {
    if (confirm('确定要删除这个数据库配置吗？')) {
      const updatedDatabases = databases.filter(db => db.id !== id)
      onDatabasesChange(updatedDatabases)
      if (selectedDatabaseId === id) {
        onSelectedDatabaseIdChange(null)
      }
    }
  }

  const handleTestConnection = async (db: DatabaseConfig) => {
    setTestingDb(db.id)
    setTestResult({ id: db.id, success: true, message: 'MongoDB 连接暂不支持' })
    setTestingDb(null)
  }

  const resetDbForm = () => {
    setDbFormData({
      name: '',
      connectionString: '',
    })
  }

  return (
    <>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold mb-1">数据存储方式</h3>
            <p className="text-sm text-slate-400">选择数据存储方式</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                storageType === 'localStorage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onStorageTypeChange('localStorage')}
            >
              📱 LocalStorage
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                storageType === 'indexedDB'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onStorageTypeChange('indexedDB')}
            >
              🗃️ IndexedDB
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                storageType === 'mongodb'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onStorageTypeChange('mongodb')}
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
                    placeholder="mongodb://username:password@localhost:27017/database"
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
  )
}