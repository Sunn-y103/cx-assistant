import { useState, useMemo } from 'react'
import { AppShell } from '../components/layout'
import { useBrand } from '../context/BrandContext'
import { useBrandPolicies } from '../hooks/useBrandPolicies'
import type { BrandPolicy, PolicyCategory } from '../types/database'
import type { CreatePolicyInput } from '../hooks/useBrandPolicies'
import {
  PolicyCard,
  PolicyFormModal,
  PolicyDetailModal,
  DeleteConfirmModal,
} from '../components/knowledge-base'
import {
  BookOpenIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
} from '../components/icons'

type StatusFilter = 'all' | 'active' | 'inactive'

const CATEGORY_TABS: { label: string; value: PolicyCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Returns', value: 'returns' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Billing', value: 'billing' },
  { label: 'Warranties', value: 'warranties' },
  { label: 'General', value: 'general' },
]

export default function KnowledgeBasePage() {
  const { selectedBrand } = useBrand()
  const {
    policies,
    loading,
    error,
    refresh,
    create,
    update,
    toggleActive,
    remove,
  } = useBrandPolicies(selectedBrand?.id ?? null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<BrandPolicy | null>(null)
  const [viewingPolicy, setViewingPolicy] = useState<BrandPolicy | null>(null)
  const [deletingPolicy, setDeletingPolicy] = useState<BrandPolicy | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Feedback banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => {
      setSuccessMessage(null)
    }, 4000)
  }

  // Filtered policies computation
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      // Category filter
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false
      }
      // Status filter
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'inactive' && p.is_active) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchContent = p.content.toLowerCase().includes(q)
        const matchCat = p.category.toLowerCase().includes(q)
        if (!matchTitle && !matchContent && !matchCat) return false
      }
      return true
    })
  }, [policies, categoryFilter, statusFilter, searchQuery])

  // Stats
  const activeCount = useMemo(() => policies.filter((p) => p.is_active).length, [policies])
  const inactiveCount = useMemo(() => policies.filter((p) => !p.is_active).length, [policies])

  // Handlers
  const handleOpenCreate = () => {
    setEditingPolicy(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (p: BrandPolicy) => {
    setEditingPolicy(p)
    setFormModalOpen(true)
  }

  const handleSavePolicy = async (input: CreatePolicyInput) => {
    if (editingPolicy) {
      await update(editingPolicy.id, input)
      showNotification('Policy updated successfully')
    } else {
      await create(input)
      showNotification('New policy added successfully')
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    setTogglingId(id)
    try {
      await toggleActive(id, current)
      showNotification(current ? 'Policy deactivated' : 'Policy activated')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingPolicy) return
    setDeleting(true)
    try {
      await remove(deletingPolicy.id)
      setDeletingPolicy(null)
      showNotification('Policy deleted permanently')
    } finally {
      setDeleting(false)
    }
  }

  const brandName = selectedBrand?.name ?? 'Selected Brand'

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto min-w-0 select-none">
        {/* Top Header Section */}
        <div className="p-4 sm:p-6 bg-white border-b border-[#eaecf0] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Title & Brand indicator */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#00a86b] flex-shrink-0 shadow-2xs">
                <BookOpenIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Knowledge Base & Policies
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]" />
                    {brandName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Brand policies and standard operating procedures used by the CX reply assistant.
                </p>
              </div>
            </div>

            {/* Actions: Refresh & Create New Policy */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={refresh}
                title="Refresh knowledge base"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 shadow-2xs bg-white"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin text-[#00a86b]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                disabled={!selectedBrand}
                className="h-9 px-4 py-2 bg-[#00a86b] hover:bg-[#00915c] disabled:bg-slate-200 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Policy</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-white border border-[#eaecf0] rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Policies</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{policies.length}</span>
            </div>
            <div className="p-3 bg-white border border-[#eaecf0] rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active (In Prompt)</span>
              <span className="text-sm font-bold text-[#00a86b] font-mono">{activeCount}</span>
            </div>
            <div className="p-3 bg-white border border-[#eaecf0] rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Draft / Inactive</span>
              <span className="text-sm font-bold text-slate-500 font-mono">{inactiveCount}</span>
            </div>
            <div className="p-3 bg-white border border-[#eaecf0] rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Scoped Brand</span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{brandName}</span>
            </div>
          </div>
        </div>

        {/* Notifications / Feedback */}
        {successMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-semibold rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-[#00a86b]" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-[#065f46] hover:text-[#004d40] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center justify-between shadow-2xs">
            <span>{error}</span>
            <button
              onClick={refresh}
              className="text-rose-700 underline hover:text-rose-900 font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-6 pb-2 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input: 36px height, icon at left 12px, padding-left 36px */}
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policies by title, rules, or keywords..."
                className="w-full h-9 bg-white text-xs text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-9 py-2 border border-[#e5e7eb] focus:outline-none focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active / Inactive Status Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#e5e7eb] shadow-2xs self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-[#ecfdf5] text-[#065f46] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((tab) => {
              const isActive = categoryFilter === tab.value
              const count =
                tab.value === 'all'
                  ? policies.length
                  : policies.filter((p) => p.category === tab.value).length

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setCategoryFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isActive
                      ? 'bg-[#111827] text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Policy Grid / Content Area */}
        <div className="p-4 sm:p-6 pt-2 flex-1">
          {loading && policies.length === 0 ? (
            /* Loading skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-4 bg-white border border-[#eaecf0] rounded-xl flex flex-col gap-3 animate-pulse shadow-2xs"
                >
                  <div className="flex justify-between">
                    <div className="h-4 bg-slate-200 rounded w-20" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-48" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between">
                    <div className="h-8 bg-slate-100 rounded w-24" />
                    <div className="h-8 bg-slate-100 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : policies.length === 0 ? (
            /* Empty state: No policies exist for this brand */
            <div className="p-8 sm:p-12 text-center bg-white border border-[#eaecf0] rounded-2xl flex flex-col items-center justify-center gap-3 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#00a86b] shadow-2xs">
                <BookOpenIcon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No policies defined for {brandName}
              </h3>
              <p className="text-xs text-slate-500 max-w-[360px] leading-relaxed">
                Add return windows, warranty terms, shipping guidelines, or FAQs so the CX assistant can draft accurate answers.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-2 h-9 px-4 py-2 bg-[#00a86b] hover:bg-[#00915c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create First Policy</span>
              </button>
            </div>
          ) : filteredPolicies.length === 0 ? (
            /* Empty state: Filters or search query yielded no results */
            <div className="p-8 text-center bg-white border border-[#eaecf0] rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xs text-slate-500">
              <p className="text-sm font-semibold text-slate-800">
                No policies match your search or filters
              </p>
              <p className="text-xs text-slate-400">
                Try adjusting your search terms, category, or active status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('all')
                  setStatusFilter('all')
                }}
                className="mt-2 h-9 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            /* Policy Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPolicies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  onView={(p) => setViewingPolicy(p)}
                  onEdit={handleOpenEdit}
                  onDelete={(p) => setDeletingPolicy(p)}
                  onToggleActive={handleToggleActive}
                  toggling={togglingId === policy.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <PolicyFormModal
          isOpen={formModalOpen}
          brandName={brandName}
          initialPolicy={editingPolicy}
          onClose={() => {
            setFormModalOpen(false)
            setEditingPolicy(null)
          }}
          onSave={handleSavePolicy}
        />

        <PolicyDetailModal
          isOpen={Boolean(viewingPolicy)}
          policy={viewingPolicy}
          brandName={brandName}
          onClose={() => setViewingPolicy(null)}
          onEdit={(p) => {
            setViewingPolicy(null)
            handleOpenEdit(p)
          }}
          onDelete={(p) => {
            setViewingPolicy(null)
            setDeletingPolicy(p)
          }}
          onToggleActive={handleToggleActive}
        />

        <DeleteConfirmModal
          isOpen={Boolean(deletingPolicy)}
          policy={deletingPolicy}
          brandName={brandName}
          onClose={() => setDeletingPolicy(null)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      </div>
    </AppShell>
  )
}
