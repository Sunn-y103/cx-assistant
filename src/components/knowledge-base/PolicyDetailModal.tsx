import type { BrandPolicy } from '../../types/database'
import { getCategoryBadge } from './PolicyCard'
import { XIcon, EditIcon, TrashIcon } from '../icons'

interface PolicyDetailModalProps {
  policy: BrandPolicy | null
  brandName: string
  isOpen: boolean
  onClose: () => void
  onEdit: (policy: BrandPolicy) => void
  onDelete: (policy: BrandPolicy) => void
  onToggleActive: (id: string, current: boolean) => Promise<void>
}

export function PolicyDetailModal({
  policy,
  brandName,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}: PolicyDetailModalProps) {
  if (!isOpen || !policy) return null

  const cat = getCategoryBadge(policy.category)
  const createdDate = new Date(policy.created_at).toLocaleString()
  const updatedDate = new Date(policy.updated_at).toLocaleString()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#eaecf0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${cat.classes}`}
            >
              {cat.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                policy.is_active
                  ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  policy.is_active ? 'bg-[#00a86b]' : 'bg-slate-400'
                }`}
              />
              <span>{policy.is_active ? 'Active Policy' : 'Inactive Policy'}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.06em]">
              Brand: {brandName}
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {policy.title}
            </h2>
          </div>

          <div className="p-4 bg-[#f9fafb] border border-[#eaecf0] rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
            {policy.content}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl text-xs text-slate-500">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Created
              </span>
              <span className="font-mono text-slate-700 text-[11px]">{createdDate}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Last Updated
              </span>
              <span className="font-mono text-slate-700 text-[11px]">{updatedDate}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#f1f3f6] flex items-center justify-between gap-2 bg-white">
          <button
            type="button"
            onClick={() => {
              onToggleActive(policy.id, policy.is_active)
              onClose()
            }}
            className={`h-9 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-2 ${
              policy.is_active
                ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                : 'bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5] border-[#a7f3d0]'
            }`}
          >
            <span>{policy.is_active ? 'Deactivate' : 'Activate'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onDelete(policy)
              }}
              className="h-9 px-3.5 py-2 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(policy)
              }}
              className="h-9 px-4 py-2 rounded-lg text-xs font-semibold bg-[#111827] hover:bg-[#1f2937] text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit Policy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
