import type { BrandPolicy } from '../../types/database'
import { TrashIcon, XIcon } from '../icons'

interface DeleteConfirmModalProps {
  policy: BrandPolicy | null
  brandName: string
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  deleting: boolean
}

export function DeleteConfirmModal({
  policy,
  brandName,
  isOpen,
  onClose,
  onConfirm,
  deleting,
}: DeleteConfirmModalProps) {
  if (!isOpen || !policy) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#eaecf0] flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
              <TrashIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Brand Policy</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete <strong className="text-slate-900 font-semibold">{policy.title}</strong> from <strong className="text-slate-900 font-semibold">{brandName}</strong>?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
            <strong>Warning:</strong> This action permanently deletes the policy from Supabase and AI CX suggestion contexts.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#f1f3f6] flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-9 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Permanently Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
