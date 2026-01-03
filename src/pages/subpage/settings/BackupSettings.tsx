import { useState } from 'react'
import { storage, downloadBackup } from '../../../utils/storage'
import { importBackup as importBackupUtil } from '../../../utils/storage'

export default function BackupSettings() {
  const [importing, setImporting] = useState(false)

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
        alert('系统设置导入成功，请刷新页面以查看更新')
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } catch (error) {
      console.error(error)
      alert('导入失败：文件格式错误')
    }

    event.target.value = ''
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      await importBackupUtil(file)
      alert('备份导入成功')
    } catch (error) {
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleClearDatabase = async () => {
    if (confirm('确定要清除所有数据吗？此操作将删除所有小说、人物和章节数据，且不可恢复！\n\n建议先导出备份。')) {
      try {
        await storage.clearDatabase()
        alert('所有数据已清除')
      } catch (error) {
        alert('清除失败: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
  }

  const handleDeleteDatabase = async () => {
    if (confirm('确定要删除整个数据库吗？这将删除所有数据并重置数据库，且不可恢复！\n\n建议先导出备份。')) {
      try {
        await storage.deleteDatabase()
        alert('数据库已删除，页面将刷新')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
  }

  return (
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

      <div className="bg-red-900/20 border border-red-600 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-400">🗑️ 清除所有数据</h3>
        <p className="text-slate-400 mb-4">删除所有小说、人物和章节数据（此操作不可恢复，请谨慎操作）</p>
        <button
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          onClick={handleClearDatabase}
        >
          🗑️ 清除所有数据
        </button>
      </div>

      <div className="bg-red-900/20 border border-red-600 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-400">💥 删除数据库</h3>
        <p className="text-slate-400 mb-4">删除整个数据库（包括 IndexedDB），重置所有数据（此操作不可恢复，请谨慎操作）</p>
        <button
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          onClick={handleDeleteDatabase}
        >
          💥 删除数据库
        </button>
      </div>
    </div>
  )
}