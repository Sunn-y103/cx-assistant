import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { BrandPolicy, PolicyCategory } from '../../types/database'
import type { CreatePolicyInput } from '../../hooks/useBrandPolicies'
import { XIcon, SparklesIcon } from '../icons'

interface PolicyFormModalProps {
  isOpen: boolean
  brandName: string
  initialPolicy?: BrandPolicy | null
  onClose: () => void
  onSave: (data: CreatePolicyInput) => Promise<void>
}

const CATEGORIES: { label: string; value: PolicyCategory }[] = [
  { label: 'Returns & Refunds', value: 'returns' },
  { label: 'Shipping & Delivery', value: 'shipping' },
  { label: 'Billing & Invoicing', value: 'billing' },
  { label: 'Warranties & Guarantees', value: 'warranties' },
  { label: 'General Policies & FAQ', value: 'general' },
]

export function PolicyFormModal({
  isOpen,
  brandName,
  initialPolicy,
  onClose,
  onSave,
}: PolicyFormModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PolicyCategory>('general')
  const [content, setContent] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEditing = Boolean(initialPolicy)

  useEffect(() => {
    if (initialPolicy) {
      setTitle(initialPolicy.title)
      setCategory(initialPolicy.category)
      setContent(initialPolicy.content)
      setIsActive(initialPolicy.is_active)
    } else {
      setTitle('')
      setCategory('general')
      setContent('')
      setIsActive(true)
    }
    setValidationError(null)
  }, [initialPolicy, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!title.trim()) {
      setValidationError('Please enter a policy title.')
      return
    }

    if (title.trim().length < 3) {
      setValidationError('Policy title must be at least 3 characters long.')
      return
    }

    if (!content.trim()) {
      setValidationError('Please enter policy content.')
      return
    }

    if (content.trim().length < 10) {
      setValidationError('Policy content must be at least 10 characters long.')
      return
    }

    setSubmitting(true)
    try {
      await onSave({
        title: title.trim(),
        category,
        content: content.trim(),
        is_active: isActive,
      })
      onClose()
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to save policy')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#eaecf0] flex items-center justify-between bg-white">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold text-slate-900">
              {isEditing ? 'Edit Brand Policy' : 'Create Brand Policy'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Managing guidelines for <span className="text-[#00a86b] font-semibold">{brandName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium flex items-center justify-between">
              <span>{validationError}</span>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-700 hover:text-rose-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.06em]">
              Policy Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30-Day Return Window & Requirements"
              className="w-full h-9 px-3 bg-[#f9fafb] border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] transition-all shadow-2xs"
            />
          </div>

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.06em]">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PolicyCategory)}
              className="w-full h-9 px-3 bg-[#f9fafb] hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] transition-all shadow-2xs cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center justify-between p-3 bg-[#f9fafb] border border-slate-200/80 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900">Active Status</span>
              <span className="text-[11px] text-slate-500">
                Only active policies are utilized for AI assistance and customer guidance.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00a86b]"></div>
            </label>
          </div>

          {/* Content Textarea */}
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.06em]">
                Policy Content / Rules <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {content.length} characters
              </span>
            </div>
            <textarea
              rows={6}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State the official brand policy clearly with conditions, deadlines, fees, and expectations..."
              className="w-full p-3 bg-[#f9fafb] border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] resize-none transition-all shadow-2xs font-sans"
            />
          </div>

          {/* AI Notice pill */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-[#ecfdf5] border border-[#a7f3d0] p-2.5 rounded-lg">
            <SparklesIcon className="w-4 h-4 text-[#00a86b] flex-shrink-0" />
            <span>
              Policies are securely stored in Supabase with RLS scoped strictly to <strong>{brandName}</strong>.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#f1f3f6] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 py-2 bg-[#00a86b] hover:bg-[#00915c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Policy'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
