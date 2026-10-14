import type { BrandPolicy, PolicyCategory } from '../../types/database'
import { EditIcon, TrashIcon, EyeIcon } from '../icons'

interface PolicyCardProps {
  policy: BrandPolicy
  onView: (policy: BrandPolicy) => void
  onEdit: (policy: BrandPolicy) => void
  onDelete: (policy: BrandPolicy) => void
  onToggleActive: (id: string, current: boolean) => Promise<void>
  toggling?: boolean
}

export function getCategoryBadge(category: PolicyCategory) {
  switch (category) {
    case 'returns':
      return {
        label: 'Returns',
        classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
      }
    case 'shipping':
      return {
        label: 'Shipping',
        classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
      }
    case 'billing':
      return {
        label: 'Billing',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      }
    case 'warranties':
      return {
        label: 'Warranties',
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
      }
    case 'general':
    default:
      return {
        label: 'General',
        classes: 'bg-gray-100 text-gray-700 border-gray-200',
      }
  }
}

export function PolicyCard({
  policy,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  toggling = false,
}: PolicyCardProps) {
  const cat = getCategoryBadge(policy.category)
  const updatedDate = new Date(policy.updated_at || policy.created_at).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  )

  return (
    <div
      className={`p-4 bg-white border rounded-xl transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3 ${
        policy.is_active ? 'border-[#eaecf0]' : 'border-slate-200/60 bg-slate-50/40 opacity-80'
      }`}
    >
      <div className="flex flex-col gap-2">
        {/* Category & Status badges */}
        <div className="flex items-center justify-between gap-2">
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
              <span>{policy.is_active ? 'Active' : 'Inactive'}</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Updated {updatedDate}
          </span>
        </div>

        {/* Title */}
        <h4
          onClick={() => onView(policy)}
          className="text-sm font-semibold text-slate-900 hover:text-[#00a86b] transition-colors cursor-pointer leading-snug"
        >
          {policy.title}
        </h4>

        {/* Content preview */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-line">
          {policy.content}
        </p>
      </div>

      {/* Action Toolbar */}
      <div className="pt-3 border-t border-[#f1f3f6] flex items-center justify-between gap-2">
        {/* Active Toggle Button */}
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggleActive(policy.id, policy.is_active)}
          className={`h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
            policy.is_active
              ? 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
              : 'bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5] border-[#a7f3d0]'
          } disabled:opacity-50`}
          title={policy.is_active ? 'Deactivate policy' : 'Activate policy'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              policy.is_active ? 'bg-slate-400' : 'bg-[#00a86b]'
            }`}
          />
          <span>{policy.is_active ? 'Deactivate' : 'Activate'}</span>
        </button>

        {/* Icon Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView(policy)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="View full policy"
          >
            <EyeIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(policy)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Edit policy"
          >
            <EditIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(policy)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete policy"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
