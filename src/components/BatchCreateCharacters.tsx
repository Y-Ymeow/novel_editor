import { useState } from 'react'
import type { Character, Novel } from '../types'
import { storage } from '../utils/storage'
import Modal from './Modal'
import AiInput from './AiInput'

interface BatchCreateCharactersProps {
  currentNovelId: string | null
  currentNovel: Novel | null
  characters: Character[]
  onCharactersChange: (characters: Character[]) => void
}

export default function BatchCreateCharacters({
  currentNovelId,
  currentNovel,
  characters,
  onCharactersChange
}: BatchCreateCharactersProps) {
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false)
  const [showBatchResultModal, setShowBatchResultModal] = useState(false)
  const [batchInput, setBatchInput] = useState('')
  const [batchCreatedCharacters, setBatchCreatedCharacters] = useState<Character[]>([])
  const [pendingCharacters, setPendingCharacters] = useState<Partial<Character>[]>([])
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null)

  const getBatchCharactersPrompt = () => {
    const settings = storage.getSettings()
    return settings.prompts?.generateBatchCharacters || ''
  }

  const handleBatchCreate = async () => {
    if (!batchInput.trim()) {
      alert('请输入要创建的人物描述')
      return
    }

    if (!currentNovelId) {
      alert('请先选择小说')
      return
    }

    try {
      const lines = batchInput.split('\n').filter(line => line.trim())
      const newCharacters: Character[] = []

      for (const line of lines) {
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            const charData = JSON.parse(line)

            const newCharacter: Character = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              novelId: currentNovelId,
              name: charData.name || '',
              gender: charData.gender || '',
              personality: charData.personality || '',
              background: charData.background || '',
              relationships: charData.relationships || '',
              notes: charData.notes || '',
              summary: charData.summary || '',
              createdAt: Date.now(),
            }
            newCharacters.push(newCharacter)
            await storage.saveCharacter(newCharacter)
            continue
          } catch (e) {
            console.error(e)
          }
        }

        let name = ''
        let type = ''
        let description = ''

        if (line.includes('：') || line.includes(':')) {
          const parts = line.split(/[:：]/)
          if (parts.length >= 1) {
            name = parts[0].trim()

            if (parts.length >= 2) {
              const remaining = parts.slice(1).join('').trim()

              if (remaining.includes(' - ') || remaining.includes('—')) {
                const typeDescParts = remaining.split(/\s*[-—]\s*/)
                type = typeDescParts[0].trim()
                description = typeDescParts.slice(1).join(' - ').trim()
              } else {
                type = remaining
              }
            }
          }
        } else {
          type = line.trim()
        }

        if (!name && type) {
          name = type
        }

        let notes = type
        if (description) {
          notes += ` - ${description}`
        }

        const newCharacter: Character = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          novelId: currentNovelId,
          name: name,
          gender: '',
          personality: '',
          background: '',
          relationships: '',
          notes: notes,
          createdAt: Date.now(),
        }
        newCharacters.push(newCharacter)
        await storage.saveCharacter(newCharacter)
      }

      onCharactersChange([...characters, ...newCharacters])
      setBatchCreatedCharacters(newCharacters)
      setBatchInput('')
      setShowBatchModal(false)
      setShowBatchResultModal(true)
    } catch (error) {
      console.error('批量创建失败:', error)
      alert('批量创建失败，请重试')
    }
  }

  const handleBatchAiGenerate = async (generated: string) => {
    try {
      let jsonStr = generated

      const firstBracket = generated.indexOf('[')
      const lastBracket = generated.lastIndexOf(']')

      if (firstBracket !== -1 && lastBracket !== -1) {
        jsonStr = generated.substring(firstBracket, lastBracket + 1)
      }

      jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      jsonStr = jsonStr.replace(/'/g, '"')

      let parsed;
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseError) {
        try {
          jsonStr = jsonStr.replace(/new\s+\w+/g, '')
          jsonStr = jsonStr.replace(/function\s*\(/g, '')
          parsed = Function.apply(`(${jsonStr})`)
        } catch (evalError) {
          throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`)
        }
      }

      if (Array.isArray(parsed)) {
        const validCharacters = parsed.filter((item: any) =>
          typeof item === 'object' && item.name
        )

        if (validCharacters.length > 0) {
          setPendingCharacters(validCharacters)
          setShowBatchConfirmModal(true)
        } else {
          throw new Error('解析的数组中没有找到有效的人物信息')
        }
      } else if (typeof parsed === 'object') {
        if (parsed.name) {
          setPendingCharacters([parsed])
          setShowBatchConfirmModal(true)
        } else {
          throw new Error('无法从返回内容中提取人物信息')
        }
      } else {
        throw new Error('AI 返回的不是有效的数组或对象格式')
      }
    } catch (error) {
      console.error('解析 AI 返回内容失败:', error)
      console.error('原始内容:', generated)

      alert(`AI 返回的内容不是有效的 JSON 格式！\n\n错误: ${error instanceof Error ? error.message : '未知错误'}\n\n原始内容:\n${generated.slice(0, 500)}...`)
    }
  }

  const handleBatchConfirm = async () => {
    if (!currentNovelId) {
      alert('请先选择小说')
      return
    }

    try {
      const newCharacters: Character[] = []

      for (const charData of pendingCharacters) {
        const newCharacter: Character = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          novelId: currentNovelId,
          name: charData.name || '',
          gender: charData.gender || '',
          personality: charData.personality || '',
          background: charData.background || '',
          relationships: charData.relationships || '',
          notes: charData.notes || '',
          summary: charData.summary || '',
          createdAt: Date.now(),
        }
        newCharacters.push(newCharacter)
        await storage.saveCharacter(newCharacter)
      }

      onCharactersChange([...characters, ...newCharacters])
      setBatchCreatedCharacters(newCharacters)
      setBatchInput('')
      setPendingCharacters([])
      setShowBatchConfirmModal(false)
      setShowBatchModal(false)
      setShowBatchResultModal(true)
    } catch (error) {
      console.error('批量创建失败:', error)
      alert('批量创建失败，请重试')
    }
  }

  const handleBatchCancel = () => {
    setPendingCharacters([])
    setShowBatchConfirmModal(false)
  }

  const handleGenerateCharacterDetail = async (character: Character) => {
    setGeneratingCharacterId(character.id)

    try {
      // 这里需要调用父组件的方法来打开编辑弹窗
      // 由于这个组件是独立的，我们需要通过回调传递
      alert('请在角色列表中点击"编辑"按钮来生成详细信息')
    } catch (error) {
      console.error('生成角色详情失败:', error)
      alert('生成失败，请手动编辑')
    } finally {
      setGeneratingCharacterId(null)
    }
  }

  return (
    <>
      <button
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
        onClick={() => { setShowBatchModal(true); setBatchInput('') }}
      >
        🤖 批量创建
      </button>

      <Modal
        isOpen={showBatchModal}
        onClose={() => { setShowBatchModal(false); setBatchInput('') }}
        title="批量创建人物"
        maxWidth="2xl"
        footer={
          <div className="flex gap-2">
            <button
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              onClick={handleBatchCreate}
            >
              创建
            </button>
            <button
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowBatchModal(false); setBatchInput('') }}
            >
              取消
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <h3 className="text-lg font-semibold mb-3">🤖 AI 生成人物列表</h3>
            <AiInput
              onGenerate={handleBatchAiGenerate}
              placeholder="描述你想要创建的人物，例如：生成3个主要人物，包括主角、反派和配角..."
              buttonText="🚀 生成人物列表"
              currentNovelId={currentNovelId}
              systemPrompt={(() => {
                const prompt = getBatchCharactersPrompt()
                return prompt
                  .replace(/\{\{novelTitle\}\}/g, currentNovel?.title || "")
                  .replace(/\{\{novelDescription\}\}/g, currentNovel?.description || "")
              })()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">人物列表（每行一个）</label>
            <textarea
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              rows={10}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="张三：主角，勇敢的战士&#10;李四：反派，阴险的谋士&#10;王五：配角，忠诚的侍卫&#10;或者直接输入：&#10;3个反派&#10;2个配角"
            />
            <p className="text-xs text-slate-500 mt-2">
              每行一个人物，可以使用"姓名: 描述"格式，也可以只输入描述（如"3个反派"），系统会保留这些信息用于后续生成
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBatchConfirmModal}
        onClose={handleBatchCancel}
        title={`确认创建 - ${pendingCharacters.length} 个人物`}
        maxWidth="2xl"
        footer={
          <div className="flex gap-2">
            <button
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              onClick={handleBatchConfirm}
            >
              确认创建
            </button>
            <button
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              onClick={handleBatchCancel}
            >
              取消
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
            <p className="text-sm text-yellow-200">
              ⚠️ 请确认以下角色信息是否正确，确认后将创建这些角色。
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingCharacters.map((char, index) => (
              <div
                key={index}
                className="bg-slate-700/50 rounded-xl p-4 border border-slate-600"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center text-xl shrink-0">👤</div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h4 className="font-semibold text-white">{char.name}</h4>
                      {char.gender && (
                        <span className="text-xs text-slate-400 ml-2">{char.gender}</span>
                      )}
                    </div>
                    {char.summary && (
                      <p className="text-sm text-purple-400">{char.summary}</p>
                    )}
                    {char.personality && (
                      <div>
                        <span className="text-xs text-slate-400">性格：</span>
                        <span className="text-sm text-slate-300">{char.personality}</span>
                      </div>
                    )}
                    {char.background && (
                      <div>
                        <span className="text-xs text-slate-400">背景：</span>
                        <span className="text-sm text-slate-300 line-clamp-2">{char.background}</span>
                      </div>
                    )}
                    {char.relationships && (
                      <div>
                        <span className="text-xs text-slate-400">关系：</span>
                        <span className="text-sm text-slate-300">{char.relationships}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBatchResultModal}
        onClose={() => { setShowBatchResultModal(false); setBatchCreatedCharacters([]) }}
        title={`批量创建完成 - ${batchCreatedCharacters.length} 个人物`}
        maxWidth="2xl"
        footer={
          <div className="flex gap-2">
            <button
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowBatchResultModal(false); setBatchCreatedCharacters([]) }}
            >
              完成
            </button>
            <button
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowBatchResultModal(false); setBatchCreatedCharacters([]); setShowBatchModal(true); setBatchInput('') }}
            >
              继续创建
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
            <p className="text-sm text-blue-200">
              💡 提示：人物已创建成功！如果人物信息已完整，可以直接使用；如果信息不完整，可以点击"生成详情"按钮补充。
            </p>
            {characters.length > 0 && (
              <p className="text-sm text-blue-200 mt-2">
                📚 当前已有 {characters.length} 个角色，AI 会参考这些角色来生成合理的关系和背景。
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {batchCreatedCharacters.map((char) => {
              const hasCompleteInfo = char.personality && char.background && char.relationships
              return (
                <div
                  key={char.id}
                  className="flex items-center justify-between bg-slate-700/50 rounded-xl p-4 border border-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center text-xl shrink-0">👤</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{char.name}</h4>
                      {char.summary && (
                        <p className="text-xs text-purple-400 truncate">
                          {char.summary}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {hasCompleteInfo ? '✓ 已完善' : '○ 待完善'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!hasCompleteInfo && (
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleGenerateCharacterDetail(char)}
                        disabled={generatingCharacterId === char.id}
                      >
                        {generatingCharacterId === char.id ? '生成中...' : '🤖 生成详情'}
                      </button>
                    )}
                    <button
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                      onClick={() => alert('请在角色列表中点击"编辑"按钮')}
                    >
                      编辑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </>
  )
}