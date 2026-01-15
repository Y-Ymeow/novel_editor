import { useState, useEffect } from 'react'
import type { ModelParameters } from '../../../types'

interface ModelParametersSettingsProps {
  parameters: ModelParameters
  onParametersChange: (parameters: ModelParameters) => void
}

export default function ModelParametersSettings({ parameters, onParametersChange }: ModelParametersSettingsProps) {
  const [localParams, setLocalParams] = useState<ModelParameters>(parameters)

  useEffect(() => {
    setLocalParams(parameters)
  }, [parameters])

  const handleChange = (field: keyof ModelParameters, value: any) => {
    const newParams = { ...localParams, [field]: value }
    setLocalParams(newParams)
    onParametersChange(newParams)
  }

  const resetToDefault = () => {
    const defaultParams: ModelParameters = {
      temperature: 0.8,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    }
    setLocalParams(defaultParams)
    onParametersChange(defaultParams)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">🎛️ 全局模型参数</h3>
          <button
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            onClick={resetToDefault}
          >
            重置默认
          </button>
        </div>

        <div className="space-y-6">
          {/* Temperature */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Temperature (温度)</label>
              <span className="text-sm text-blue-400 font-mono">{localParams.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localParams.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              控制输出的随机性。值越高，输出越随机；值越低，输出越确定。
            </p>
          </div>

          {/* Top P */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Top P</label>
              <span className="text-sm text-blue-400 font-mono">{localParams.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localParams.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              核采样参数，控制从概率最高的 tokens 中采样的比例。
            </p>
          </div>

          {/* Frequency Penalty */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Frequency Penalty (频率惩罚)</label>
              <span className="text-sm text-blue-400 font-mono">{localParams.frequencyPenalty?.toFixed(2) ?? 0}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={localParams.frequencyPenalty ?? 0}
              onChange={(e) => handleChange('frequencyPenalty', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              减少重复内容。正值会惩罚重复的 tokens。
            </p>
          </div>

          {/* Presence Penalty */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Presence Penalty (存在惩罚)</label>
              <span className="text-sm text-blue-400 font-mono">{localParams.presencePenalty?.toFixed(2) ?? 0}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={localParams.presencePenalty ?? 0}
              onChange={(e) => handleChange('presencePenalty', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              鼓励谈论新话题。正值会惩罚已经出现过的 tokens。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <p className="text-sm text-slate-400">
          💡 <strong>提示：</strong>这些参数将应用于所有 API 调用。某些提供商可能不支持所有参数。
        </p>
      </div>
    </div>
  )
}