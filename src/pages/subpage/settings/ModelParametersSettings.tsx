import { useState, useEffect } from 'react'
import type { ModelParameters, GroqReasoningFormat, GroqReasoningEffort } from '../../../types'

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

      {/* Groq 特定参数 */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-6">🧠 Groq 思考参数</h3>
        
        <div className="space-y-6">
          {/* Reasoning Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Reasoning Format</label>
            <select
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={localParams.groqReasoningFormat ?? 'parsed'}
              onChange={(e) => handleChange('groqReasoningFormat', e.target.value as GroqReasoningFormat)}
            >
              <option value="parsed">Parsed - 分离推理内容到专用字段</option>
              <option value="raw">Raw - 在主文本中包含 &lt;thinking&gt; 标签</option>
              <option value="hidden">Hidden - 只返回最终答案</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              控制 Groq 模型推理过程的呈现方式。仅适用于 Groq 提供商。
            </p>
          </div>

          {/* Include Reasoning */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeReasoning"
              checked={localParams.groqIncludeReasoning ?? true}
              onChange={(e) => handleChange('groqIncludeReasoning', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="includeReasoning" className="text-sm text-slate-300">
              Include Reasoning (包含推理)
            </label>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            是否在响应中包含推理内容。注意：不能与 reasoning_format 同时使用。
          </p>

          {/* Reasoning Effort */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Reasoning Effort (推理努力程度)</label>
            <select
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={localParams.groqReasoningEffort ?? 'default'}
              onChange={(e) => handleChange('groqReasoningEffort', e.target.value as GroqReasoningEffort)}
            >
              <option value="none">None - 禁用推理</option>
              <option value="default">Default - 默认推理</option>
              <option value="low">Low - 低努力推理 (GPT-OSS)</option>
              <option value="medium">Medium - 中等努力推理 (GPT-OSS)</option>
              <option value="high">High - 高努力推理 (GPT-OSS)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              控制模型在推理上投入的努力程度。Qwen 3 32B 支持 none/default，GPT-OSS 支持 low/medium/high。
            </p>
          </div>
        </div>
      </div>

      {/* Cerebras 特定参数 */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-6">⚡ Cerebras 思考参数</h3>
        
        <div className="space-y-6">
          {/* Reasoning Effort */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Reasoning Effort (推理努力程度)</label>
            <select
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={localParams.cerebrasReasoningEffort ?? 'medium'}
              onChange={(e) => handleChange('cerebrasReasoningEffort', e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Low - 最少推理，更快响应</option>
              <option value="medium">Medium - 中等推理（默认）</option>
              <option value="high">High - 大量推理，更彻底的分析</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              控制模型在推理上投入的努力程度。仅适用于 Cerebras 的 .gpt-oss-120b 模型。
            </p>
          </div>

          {/* Disable Reasoning */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cerebrasDisableReasoning"
              checked={localParams.cerebrasDisableReasoning ?? false}
              onChange={(e) => handleChange('cerebrasDisableReasoning', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="cerebrasDisableReasoning" className="text-sm text-slate-300">
              Disable Reasoning (禁用推理)
            </label>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            是否禁用推理功能。勾选后模型将不使用推理能力，响应速度更快。
          </p>
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