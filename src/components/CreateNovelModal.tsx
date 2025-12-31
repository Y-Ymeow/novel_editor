import React from 'react'
import Modal from './Modal'

interface CreateNovelModalProps {
  isOpen: boolean
  onClose: () => void
  editingId: string | null
  formData: {
    title: string
    description: string
    cover: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    title: string
    description: string
    cover: string
  }>>
  onSave: () => void
}

export default function CreateNovelModal({
  isOpen,
  onClose,
  editingId,
  formData,
  setFormData,
  onSave
}: CreateNovelModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave()
  }

  const footer = (
    <div className="flex gap-2 justify-end">
      <button
        type="button"
        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
        onClick={onClose}
      >
        取消
      </button>
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        onClick={handleSubmit}
      >
        保存
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? '编辑小说' : '新建小说'}
      footer={footer}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            标题 *
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="小说标题"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            简介
          </label>
          <textarea
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="小说简介..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            封面 URL
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.cover}
            onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
            placeholder="https://..."
          />
          {formData.cover && (
            <img src={formData.cover} alt="预览" className="mt-2 rounded max-w-xs" />
          )}
        </div>
      </form>
    </Modal>
  )
}