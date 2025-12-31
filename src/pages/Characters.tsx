import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Character } from '../types'
import { storage } from '../utils/storage'
import { getCharacters, deleteCharacter, updateCharacter, createCharacter } from '../utils/storageWrapper'
import { getNovels } from '../utils/storageWrapper'
import { buildCharacterPrompt } from '../utils/promptManager'
import Modal from '../components/Modal'
import AiInput from '../components/AiInput'
import FullscreenTextarea from '../components/FullscreenTextarea'

interface FieldHistory {
  [key: string]: string[]
}

export default function Characters() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<Character[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null)
  const [currentNovel, setCurrentNovel] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    avatar: '',
    personality: '',
    background: '',
    relationships: '',
    notes: '',
    summary: '', // 添加summary字段
  })

  const [fieldHistory, setFieldHistory] = useState<FieldHistory>({
    name: [],
    gender: [],
    avatar: [],
    personality: [],
    background: [],
    relationships: [],
    notes: [],
    summary: [], // 添加summary历史
  })

  useEffect(() => {
    const settings = storage.getSettings()
    setCurrentNovelId(settings.selectedNovelId)

    if (settings.selectedNovelId) {
      loadCharacters(settings.selectedNovelId)
      loadNovel(settings.selectedNovelId)
    }
  }, [])

  const loadCharacters = async (novelId: string) => {
    const loaded = await getCharacters(novelId)
    setCharacters(loaded)
  }

  const loadNovel = async (novelId: string) => {
    const novels = await getNovels()
    const novel = novels.find((n) => n.id === novelId)
    if (novel) {
      setCurrentNovel(novel)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入姓名')
      return
    }

    if (!currentNovelId) {
      alert('请先选择小说')
      return
    }

    if (editingId) {
      // 编辑模式：更新现有人物
      await updateCharacter(editingId, formData)
      // 更新本地状态
      const updated = characters.map(char =>
        char.id === editingId
          ? { ...char, ...formData }
          : char
      )
      setCharacters(updated)
    } else {
      // 创建模式：创建新人物
      const newCharacter: Character = {
        id: Date.now().toString(),
        novelId: currentNovelId,
        ...formData,
        createdAt: Date.now(),
      }
      await createCharacter(newCharacter)
      // 更新本地状态
      setCharacters([...characters, newCharacter])
    }

    setShowModal(false)
    setEditingId(null)
    resetForm()
  }

  const handleEdit = (char: Character) => {
    setFormData({
      name: char.name,
      gender: char.gender || '',
      avatar: char.avatar || '',
      personality: char.personality,
      background: char.background,
      relationships: char.relationships,
      notes: char.notes,
      summary: char.summary || '', // 添加summary
    })
    setEditingId(char.id)
    setShowModal(true)
    setFieldHistory({
      name: [char.name],
      gender: [char.gender || ''],
      avatar: [char.avatar || ''],
      personality: [char.personality],
      background: [char.background],
      relationships: [char.relationships],
      notes: [char.notes],
      summary: [char.summary || ''], // 添加summary历史
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个人物吗？')) {
      // 直接删除数据库中的记录
      await deleteCharacter(id)
      // 更新当前显示的人物列表（只显示当前小说的）
      if (currentNovelId) {
        const allCharacters = await getCharacters(currentNovelId)
        setCharacters(allCharacters)
      }
      if (selectedCharacter?.id === id) {
        setSelectedCharacter(null)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      gender: '',
      avatar: '',
      personality: '',
      background: '',
      relationships: '',
      notes: '',
      summary: '', // 添加summary字段
    })
    setFieldHistory({
      name: [],
      gender: [],
      avatar: [],
      personality: [],
      background: [],
      relationships: [],
      notes: [],
      summary: [], // 添加summary历史
    })
  }

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    const currentHistory = fieldHistory[field] || []
    const newValue = value.trim()
    
    if (newValue && newValue !== currentHistory[currentHistory.length - 1]) {
      setFieldHistory(prev => ({
        ...prev,
        [field]: [...prev[field], newValue]
      }))
    }
    
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleUndo = (field: keyof typeof formData) => {
    const history = fieldHistory[field]
    if (history.length > 1) {
      const newHistory = history.slice(0, -1)
      setFieldHistory(prev => ({ ...prev, [field]: newHistory }))
      setFormData(prev => ({ ...prev, [field]: newHistory[newHistory.length - 1] }))
    }
  }

  const canUndo = (field: keyof typeof formData) => {
    return (fieldHistory[field] || []).length > 1
  }

  const buildCharacterGenerationPrompt = (input: string) => {
    const novelTitle = currentNovel?.title || ""
    const novelDescription = currentNovel?.description || ""

    return buildCharacterPrompt(
      novelTitle,
      novelDescription,
      input
    )
  }

  const handleAiGenerate = (generated: string) => {
    try {
      // 尝试提取 JSON
      let jsonStr = generated
      
      // 查找第一个 { 和最后一个 }
      const firstBrace = generated.indexOf('{')
      const lastBrace = generated.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = generated.substring(firstBrace, lastBrace + 1)
      }
      
      const parsed = JSON.parse(jsonStr)
      
      // 辅助函数：将任意值转换为字符串
      const toString = (value: any): string => {
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') return value
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      }
      
      // 构建新的表单数据
      const newFormData = {
        name: toString(parsed.name) || formData.name,
        gender: toString(parsed.gender) || formData.gender,
        avatar: toString(parsed.avatar) || formData.avatar,
        personality: toString(parsed.personality) || formData.personality,
        background: toString(parsed.background) || formData.background,
        relationships: toString(parsed.relationships) || formData.relationships,
        notes: toString(parsed.notes) || formData.notes,
        summary: toString(parsed.summary) || formData.summary, // 添加处理summary
      }

      // 重置表单历史
      const newFieldHistory: FieldHistory = {
        name: [newFormData.name],
        gender: [newFormData.gender],
        avatar: [newFormData.avatar],
        personality: [newFormData.personality],
        background: [newFormData.background],
        relationships: [newFormData.relationships],
        notes: [newFormData.notes],
        summary: [newFormData.summary], // 添加summary历史
      }

      // 更新表单数据
      setFormData(newFormData)
      setFieldHistory(newFieldHistory)
      
      // 确保在AI生成后仍然保持编辑状态
      if (editingId) {
        setEditingId(editingId); // 保持编辑状态不变
      }

      alert('人物信息已生成！请在下方表单中查看并保存。')
    } catch (error) {
      console.error('解析 AI 返回内容失败:', error)
      console.error('原始内容:', generated)
      alert(`无法解析 AI 返回的内容\n\n错误: ${error instanceof Error ? error.message : '未知错误'}\n\n原始内容:\n${generated.slice(0, 200)}...`)
    }
  }

  // 处理摘要AI生成
  const handleSummaryAiGenerate = (generated: string) => {
    setFormData(prev => ({ ...prev, summary: generated }));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">👤 人物卡片</h1>
          <button 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            onClick={() => navigate('/editor')}
          >
            ← 返回编辑器
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!currentNovelId && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl mb-2">请先选择小说</h3>
            <p>前往小说管理页面创建或选择小说</p>
          </div>
        )}

        {currentNovelId && (
          <div className="max-w-4xl mx-auto space-y-6">
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowModal(true); setEditingId(null); resetForm() }}
            >
              + 新建人物
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500">
                  <div className="text-4xl mb-2">👤</div>
                  <h3 className="text-xl mb-2">暂无人物卡片</h3>
                  <p>点击上方按钮创建第一个人物</p>
                </div>
              ) : (
                characters.map((char) => (
                  <div 
                    key={char.id}
                    className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all hover:scale-105 cursor-pointer"
                    onClick={() => setSelectedCharacter(selectedCharacter?.id === char.id ? null : char)}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        {char.avatar ? (
                          <img src={char.avatar} alt={char.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center text-2xl shrink-0">👤</div>
                        )}
                        <div className="grow min-w-0">
                          <h3 className="font-bold text-lg truncate">{char.name}</h3>
                          <div className="text-xs text-slate-500">
                            {char.gender && <span className="mr-2">{char.gender}</span>}
                            {new Date(char.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {selectedCharacter?.id === char.id ? (
                        <div className="space-y-2 text-sm">
                          {char.summary && (  // 显示摘要
                            <div>
                              <span className="font-medium text-slate-400">摘要：</span>
                              <p className="text-slate-300">{char.summary}</p>
                            </div>
                          )}
                          {char.personality && (
                            <div>
                              <span className="font-medium text-slate-400">性格：</span>
                              <p className="text-slate-300">{char.personality}</p>
                            </div>
                          )}
                          {char.background && (
                            <div>
                              <span className="font-medium text-slate-400">背景：</span>
                              <p className="text-slate-300">{char.background}</p>
                            </div>
                          )}
                          {char.relationships && (
                            <div>
                              <span className="font-medium text-slate-400">关系：</span>
                              <p className="text-slate-300">{char.relationships}</p>
                            </div>
                          )}
                          {char.notes && (
                            <div>
                              <span className="font-medium text-slate-400">备注：</span>
                              <p className="text-slate-300">{char.notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {char.summary || char.personality || char.background || '点击查看详情...'}
                        </p>
                      )}
                    </div>
                    <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700 flex gap-2">
                      <button 
                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleEdit(char) }}
                      >
                        编辑
                      </button>
                      <button 
                        className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-400 rounded-xl text-sm font-medium transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDelete(char.id) }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); resetForm() }}
        title={editingId ? '编辑人物' : '新建人物'}
        maxWidth="2xl"
        footer={
          <div className="flex gap-2">
            <button 
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors" 
              onClick={handleSave}
            >
              保存
            </button>
            <button 
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowModal(false); setEditingId(null); resetForm() }}
            >
              取消
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* AI 生成部分 */}
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <h3 className="text-lg font-semibold mb-3">🤖 AI 生成</h3>
            <AiInput
              onGenerate={handleAiGenerate}
              placeholder="描述你想要创建的人物，例如：一个冷酷的刺客，身穿黑色风衣，有着神秘的过去..."
              buttonText="🚀 生成人物卡片"
              currentNovelId={currentNovelId}
              systemPrompt={`${buildCharacterGenerationPrompt('')}你是一个专业的小说人物创作助手。请根据用户的描述生成详细的人物卡片信息。
返回格式必须是 JSON 对象，包含以下字段：
- name: 姓名
- gender: 性别
- avatar: 头像 URL（可选，返回空字符串表示不需要）
- personality: 性格特点
- background: 背景故事
- relationships: 人物关系
- notes: 备注信息
- summary: 人物摘要

注意：所有字段值都必须是字符串类型，不要返回数组或对象。

只返回 JSON，不要其他文字。

${editingId ? `这是更新现有的人物，请基于以下当前数据进行修改或完善：
当前数据：
- 姓名：${formData.name}
- 性别：${formData.gender}
- 性格：${formData.personality}
- 背景：${formData.background}
- 关系：${formData.relationships}
- 备注：${formData.notes}
- 摘要：${formData.summary}

请生成更新后的完整数据，保持人物的基本特征，但根据用户描述进行修改。` : '这是创建新人物，请生成完整的新人物数据。'}`}
            />
          </div>

          {/* 表单部分 */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-300">姓名 *</label>
                  {canUndo('name') && (
                    <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('name')}>
                      ↩ 撤回
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="人物姓名"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-300">性别</label>
                  {canUndo('gender') && (
                    <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('gender')}>
                      ↩ 撤回
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.gender}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  placeholder="男/女/其他"
                  list="gender-options"
                />
                <datalist id="gender-options">
                  <option value="男" />
                  <option value="女" />
                  <option value="无性别" />
                  <option value="双性" />
                  <option value="未知" />
                </datalist>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">头像 URL</label>
                {canUndo('avatar') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('avatar')}>
                    ↩ 撤回
                  </button>
                )}
              </div>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.avatar}
                onChange={(e) => handleFieldChange('avatar', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">性格特点</label>
                {canUndo('personality') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('personality')}>
                    ↩ 撤回
                  </button>
                )}
              </div>
              <FullscreenTextarea
                value={formData.personality}
                onChange={(value) => handleFieldChange('personality', value)}
                placeholder="描述人物的性格特点..."
                className="h-20"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">背景故事</label>
                {canUndo('background') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('background')}>
                      ↩ 撤回
                    </button>
                )}
              </div>
              <FullscreenTextarea
                value={formData.background}
                onChange={(value) => handleFieldChange('background', value)}
                placeholder="人物的背景故事..."
                className="h-20"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">人物关系</label>
                {canUndo('relationships') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('relationships')}>
                    ↩ 撤回
                  </button>
                )}
              </div>
              <FullscreenTextarea
                value={formData.relationships}
                onChange={(value) => handleFieldChange('relationships', value)}
                placeholder="与其他人物的关系..."
                className="h-20"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">备注</label>
                {canUndo('notes') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('notes')}>
                      ↩ 撤回
                    </button>
                )}
              </div>
              <FullscreenTextarea
                value={formData.notes}
                onChange={(value) => handleFieldChange('notes', value)}
                placeholder="其他备注信息..."
                className="h-20"
              />
            </div>

            {/* 摘要区域 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">人物摘要</label>
                {canUndo('summary') && (
                  <button className="text-xs text-yellow-400 hover:text-yellow-300" onClick={() => handleUndo('summary')}>
                    ↩ 撤回
                  </button>
                )}
              </div>
              <FullscreenTextarea
                value={formData.summary}
                onChange={(value) => handleFieldChange('summary', value)}
                placeholder="人物的简要摘要，用于上下文参考..."
                className="h-20"
              />
            </div>

            {/* 摘要AI生成区域 */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <h3 className="text-lg font-semibold mb-3">🤖 生成人物摘要</h3>
              <AiInput
                onGenerate={handleSummaryAiGenerate}
                placeholder="描述你想要生成的人物摘要，例如：总结这个人物的核心特征..."
                buttonText="🚀 生成摘要"
                currentNovelId={currentNovelId}
                systemPrompt={`你是一个专业的小说人物摘要助手。请根据人物信息生成简洁准确的人物摘要。
                
当前人物信息：
- 姓名：${formData.name}
- 性别：${formData.gender}
- 性格：${formData.personality}
- 背景：${formData.background}
- 关系：${formData.relationships}
- 备注：${formData.notes}

请生成简洁的人物摘要，包含姓名、核心性格、背景和关键关系，用于后续的上下文参考。`}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
