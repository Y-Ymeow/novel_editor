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
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showBatchResultModal, setShowBatchResultModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null)
  const [currentNovel, setCurrentNovel] = useState<any>(null)
  const [batchInput, setBatchInput] = useState('')
  const [batchCreatedCharacters, setBatchCreatedCharacters] = useState<Character[]>([])
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    personality: '',
    background: '',
    relationships: '',
    notes: '',
    summary: '', // 添加summary字段
  })

  const [fieldHistory, setFieldHistory] = useState<FieldHistory>({
    name: [],
    gender: [],
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
      personality: '',
      background: '',
      relationships: '',
      notes: '',
      summary: '', // 添加summary字段
    })
    setFieldHistory({
      name: [],
      gender: [],
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
      // 尝试提取和修复 JSON
      let jsonStr = generated
      
      // 1. 尝试提取 JSON 对象
      const firstBrace = generated.indexOf('{')
      const lastBrace = generated.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = generated.substring(firstBrace, lastBrace + 1)
      }
      
      // 2. 尝试修复常见的 JSON 格式问题
      // 移除注释
      jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      // 移除尾随逗号
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      // 修复未加引号的键名
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // 修复单引号为双引号
      jsonStr = jsonStr.replace(/'/g, '"')
      
      // 3. 尝试解析
      let parsed: any
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseError) {
        // 4. 如果还是失败，尝试用 eval 作为最后的手段（仅用于修复）
        try {
          // 移除可能导致安全问题的内容
          jsonStr = jsonStr.replace(/new\s+\w+/g, '')
          jsonStr = jsonStr.replace(/function\s*\(/g, '')
          parsed = eval(`(${jsonStr})`)
        } catch (evalError) {
          throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`)
        }
      }
      
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
        personality: toString(parsed.personality) || formData.personality,
        background: toString(parsed.background) || formData.background,
        relationships: toString(parsed.relationships) || formData.relationships,
        notes: toString(parsed.notes) || formData.notes,
        summary: toString(parsed.summary) || formData.summary,
      }

      // 重置表单历史
      const newFieldHistory: FieldHistory = {
        name: [newFormData.name],
        gender: [newFormData.gender],
        personality: [newFormData.personality],
        background: [newFormData.background],
        relationships: [newFormData.relationships],
        notes: [newFormData.notes],
        summary: [newFormData.summary],
      }

      // 更新表单数据
      setFormData(newFormData)
      setFieldHistory(newFieldHistory)
      
      // 确保在AI生成后仍然保持编辑状态
      if (editingId) {
        setEditingId(editingId)
      }

      alert('人物信息已生成！请在下方表单中查看并保存。')
    } catch (error) {
      console.error('解析 AI 返回内容失败:', error)
      console.error('原始内容:', generated)
      
      // 尝试从文本中提取关键信息作为后备方案
      const fallbackData = extractInfoFromText(generated)
      if (Object.keys(fallbackData).length > 0) {
        const newFormData = {
          name: fallbackData.name || formData.name,
          gender: fallbackData.gender || formData.gender,
          personality: fallbackData.personality || formData.personality,
          background: fallbackData.background || formData.background,
          relationships: fallbackData.relationships || formData.relationships,
          notes: fallbackData.notes || formData.notes,
          summary: fallbackData.summary || formData.summary,
        }
        
        setFormData(newFormData)
        alert('AI 返回的格式有问题，但已尝试提取部分信息。请检查并补充完整。')
      } else {
        alert(`无法解析 AI 返回的内容\n\n错误: ${error instanceof Error ? error.message : '未知错误'}\n\n原始内容:\n${generated.slice(0, 300)}...`)
      }
    }
  }

  // 从非 JSON 文本中提取信息的后备函数
  const extractInfoFromText = (text: string): Partial<Character> => {
    const result: Partial<Character> = {}
    
    // 尝试匹配各种格式的字段
    const patterns = {
      name: /(?:姓名|name)[:：]\s*([^\n,，]+)/i,
      gender: /(?:性别|gender)[:：]\s*([^\n,，]+)/i,
      personality: /(?:性格|personality)[:：]\s*([^\n]+)/i,
      background: /(?:背景|background)[:：]\s*([^\n]+)/i,
      relationships: /(?:关系|relationships?)[:：]\s*([^\n]+)/i,
      notes: /(?:备注|notes?)[:：]\s*([^\n]+)/i,
      summary: /(?:摘要|summary)[:：]\s*([^\n]+)/i,
    }
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result[key as keyof Character] = match[1].trim()
      }
    }
    
    return result
  }

  // 处理摘要AI生成
  const handleSummaryAiGenerate = (generated: string) => {
    setFormData(prev => ({ ...prev, summary: generated }));
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
        // 检查是否是完整的 JSON 格式（AI 生成的）
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            // 尝试解析为 JSON 对象
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
            await createCharacter(newCharacter)
            continue
          } catch (e) {
            // JSON 解析失败，继续尝试其他格式
          }
        }
        
        // 如果不是 JSON，尝试解析简单格式：姓名：类型 - 描述
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
        await createCharacter(newCharacter)
      }

      setCharacters([...characters, ...newCharacters])
      setBatchCreatedCharacters(newCharacters)
      setBatchInput('')
      setShowBatchModal(false)
      setShowBatchResultModal(true)
    } catch (error) {
      console.error('批量创建失败:', error)
      alert('批量创建失败，请重试')
    }
  }

  const handleBatchAiGenerate = (generated: string) => {
    try {
      // 尝试提取和修复 JSON 数组
      let jsonStr = generated
      
      // 1. 尝试提取 JSON 数组
      const firstBracket = generated.indexOf('[')
      const lastBracket = generated.lastIndexOf(']')
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        jsonStr = generated.substring(firstBracket, lastBracket + 1)
      }
      
      // 2. 尝试修复常见的 JSON 格式问题
      // 移除注释
      jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      // 移除尾随逗号
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      // 修复未加引号的键名
      jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // 修复单引号为双引号
      jsonStr = jsonStr.replace(/'/g, '"')
      
      // 3. 尝试解析
      let parsed: any
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseError) {
        // 4. 如果还是失败，尝试用 eval 作为最后的手段
        try {
          jsonStr = jsonStr.replace(/new\s+\w+/g, '')
          jsonStr = jsonStr.replace(/function\s*\(/g, '')
          parsed = eval(`(${jsonStr})`)
        } catch (evalError) {
          throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`)
        }
      }
      
      if (Array.isArray(parsed)) {
        // 将完整的 JSON 对象格式化为 JSON 字符串，每行一个对象
        const entries = parsed.map((item: any) => {
          if (typeof item === 'object' && item.name) {
            return JSON.stringify(item)
          }
          return ''
        }).filter(Boolean)
        
        if (entries.length > 0) {
          setBatchInput(entries.join('\n'))
          alert(`已生成 ${entries.length} 个完整的人物信息，请确认后创建！`)
        } else {
          throw new Error('解析的数组中没有找到有效的人物信息')
        }
      } else if (typeof parsed === 'object') {
        // 如果返回的是单个对象
        if (parsed.name) {
          setBatchInput(JSON.stringify(parsed))
          alert(`已生成 1 个完整的人物信息，请确认后创建！`)
        } else {
          throw new Error('无法从返回内容中提取人物信息')
        }
      } else {
        throw new Error('AI 返回的不是有效的数组或对象格式')
      }
    } catch (error) {
      console.error('解析 AI 返回内容失败:', error)
      console.error('原始内容:', generated)
      
      // 尝试从文本中提取姓名作为后备方案
      const names = extractNamesFromText(generated)
      if (names.length > 0) {
        setBatchInput(names.join('\n'))
        alert(`AI 返回的格式有问题，但已尝试提取 ${names.length} 个人物。请检查并补充。`)
      } else {
        alert(`无法解析 AI 返回的内容\n\n错误: ${error instanceof Error ? error.message : '未知错误'}\n\n原始内容:\n${generated.slice(0, 300)}...`)
      }
    }
  }

  // 从非 JSON 文本中提取姓名的后备函数
  const extractNamesFromText = (text: string): string[] => {
    const names: string[] = []
    
    // 尝试匹配各种格式的姓名列表
    // 1. 匹配 "姓名: xxx" 格式
    const namePattern1 = /(?:姓名|name)[:：]\s*([^\n,，]+)/gi
    let match
    while ((match = namePattern1.exec(text)) !== null) {
      const name = match[1].trim()
      if (name && !names.includes(name)) {
        names.push(name)
      }
    }
    
    // 2. 匹配列表格式（- xxx 或 1. xxx）
    const listPattern = /^[\s]*[-•\d.]+\s*([^\n,，]{2,10})$/gm
    while ((match = listPattern.exec(text)) !== null) {
      const name = match[1].trim()
      if (name && !names.includes(name) && !name.includes(':') && !name.includes('：')) {
        names.push(name)
      }
    }
    
    // 3. 如果还是没有找到，尝试提取可能的中文姓名（2-4个汉字）
    if (names.length === 0) {
      const chineseNamePattern = /[\u4e00-\u9fa5]{2,4}/g
      while ((match = chineseNamePattern.exec(text)) !== null) {
        const name = match[0]
        if (!names.includes(name)) {
          names.push(name)
        }
      }
    }
    
    return names
  }

  // 为单个角色生成详细信息
  const handleGenerateCharacterDetail = async (character: Character) => {
    setGeneratingCharacterId(character.id)
    
    try {
      // 构建其他角色的上下文信息
      const otherCharacters = characters.filter(c => c.id !== character.id)
      let characterContext = ''
      
      if (otherCharacters.length > 0) {
        characterContext = '\n\n【已存在的其他人物】\n'
        otherCharacters.forEach((char, index) => {
          characterContext += `${index + 1}. ${char.name}：${char.summary || char.personality || char.background || '暂无描述'}\n`
        })
      }
      
      // 构建角色类型提示
      let typeHint = ''
      if (character.notes) {
        typeHint = `\n\n【角色类型】\n${character.notes}`
      }
      
      // 临时保存当前正在编辑的角色信息到 formData
      setFormData({
        name: character.name,
        gender: character.gender || '',
        personality: character.personality || '',
        background: character.background || '',
        relationships: character.relationships || '',
        notes: character.notes || '',
        summary: character.summary || '',
      })
      
      setEditingId(character.id)
      setShowModal(true)
      setShowBatchResultModal(false)
      
      // 延迟一下，确保 Modal 已经打开
      setTimeout(() => {
        // 显示提示，包含角色类型和其他角色信息
        let message = `正在为"${character.name}"生成详细信息。`
        
        if (character.notes) {
          message += `\n\n角色类型：${character.notes}`
        }
        
        if (otherCharacters.length > 0) {
          message += `\n\n已存在 ${otherCharacters.length} 个角色，AI 会参考这些角色来生成合理的关系和背景。`
        }
        
        message += `\n\n请点击 Modal 中的"🚀 生成人物卡片"按钮开始生成。`
        
        alert(message)
      }, 100)
    } catch (error) {
      console.error('生成角色详情失败:', error)
      alert('生成失败，请手动编辑')
    } finally {
      setGeneratingCharacterId(null)
    }
  }

  // 批量为所有角色生成详细信息
  const handleGenerateAllCharacterDetails = () => {
    alert('请逐个为角色生成详细信息。点击每个角色右侧的"生成详情"按钮。')
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
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                onClick={() => { setShowModal(true); setEditingId(null); resetForm() }}
              >
                + 新建人物
              </button>
              <button 
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                onClick={() => { setShowBatchModal(true); setBatchInput('') }}
              >
                🤖 批量创建
              </button>
            </div>
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
                        <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center text-2xl shrink-0">👤</div>
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
- personality: 性格特点
- background: 背景故事
- relationships: 人物关系
- notes: 备注信息
- summary: 人物摘要

注意：所有字段值都必须是字符串类型，不要返回数组或对象。

只返回 JSON，不要其他文字。

${formData.notes ? `【角色类型/定位】\n${formData.notes}\n\n` : ''}${editingId ? `这是更新现有的人物，请基于以下当前数据进行修改或完善：
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
              systemPrompt={`${buildCharacterGenerationPrompt('')}你是一个专业的小说人物创作助手。请根据用户的描述生成多个人物的完整信息。

【小说信息】
标题：${currentNovel?.title || ""}
简介：${currentNovel?.description || ""}

【创作要求】
1. 根据用户的描述生成多个人物的完整信息
2. 返回格式必须是 JSON 数组，每个元素包含所有角色字段
3. 必须包含的字段：
   - name: 姓名
   - gender: 性别
   - personality: 性格特点
   - background: 背景故事
   - relationships: 人际关系
   - notes: 备注信息
   - summary: 人物摘要（简短概括）
4. 示例格式：
   [
     {
       "name": "张三",
       "gender": "男",
       "personality": "阴险狡诈，善于操纵人心，心机深沉",
       "background": "出身贫寒，通过手段爬上高位，对主角怀有深仇大恨",
       "relationships": "主角的死对头，暗中策划阴谋",
       "notes": "主要反派之一，多次与主角正面交锋",
       "summary": "阴险狡诈的谋士，主角的死对头"
     },
     {
       "name": "李四",
       "gender": "女",
       "personality": "冷酷无情，武功高强，独来独往",
       "background": "孤儿，被杀手组织培养成顶尖刺客",
       "relationships": "受雇于反派，与主角有过交手",
       "notes": "武力值很高，后期可能被主角感化",
       "summary": "冷酷无情的刺客，受雇于反派"
     }
   ]
5. 只返回 JSON 数组，不要其他文字
6. 人物要符合小说的风格和设定
7. 每个字段都要有具体内容，不要留空
8. 人际关系要考虑与其他已存在角色的关联`}
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
        isOpen={showBatchResultModal}
        onClose={() => { setShowBatchResultModal(false); setBatchCreatedCharacters([]) }}
        title={`批量创建完成 - ${batchCreatedCharacters.length} 个人物`}
        maxWidth="3xl"
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
                      onClick={() => { handleEdit(char); setShowBatchResultModal(false) }}
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
    </div>
  )
}
