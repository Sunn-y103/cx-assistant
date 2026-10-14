import { useCallback, useEffect, useState } from 'react'
import type { BrandPolicy, PolicyCategory } from '../types/database'
import {
  getPolicies,
  createPolicy as apiCreatePolicy,
  updatePolicy as apiUpdatePolicy,
  deletePolicy as apiDeletePolicy,
  togglePolicyActive as apiToggleActive,
} from '../services/policies'

export interface CreatePolicyInput {
  title: string
  category: PolicyCategory
  content: string
  is_active: boolean
}

export interface UpdatePolicyInput {
  title?: string
  category?: PolicyCategory
  content?: string
  is_active?: boolean
}

export function useBrandPolicies(brandId: string | null) {
  const [policies, setPolicies] = useState<BrandPolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPolicies = useCallback(async () => {
    if (!brandId) {
      setPolicies([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getPolicies(brandId)
      setPolicies(data)
    } catch (err) {
      setError((err as Error).message || 'Failed to load brand policies')
    } finally {
      setLoading(false)
    }
  }, [brandId])

  // Clear policies immediately when switching brands to avoid stale cross-brand data
  useEffect(() => {
    setPolicies([])
    if (brandId) {
      fetchPolicies()
    }
  }, [brandId, fetchPolicies])

  const create = async (input: CreatePolicyInput): Promise<BrandPolicy> => {
    if (!brandId) throw new Error('No brand selected')
    setError(null)
    try {
      const created = await apiCreatePolicy({
        brand_id: brandId,
        title: input.title.trim(),
        category: input.category,
        content: input.content.trim(),
        is_active: input.is_active,
      })
      setPolicies((prev) => [created, ...prev])
      return created
    } catch (err) {
      const msg = (err as Error).message || 'Failed to create policy'
      setError(msg)
      throw err
    }
  }

  const update = async (id: string, updates: UpdatePolicyInput): Promise<BrandPolicy> => {
    setError(null)
    try {
      const updated = await apiUpdatePolicy(id, {
        ...(updates.title !== undefined && { title: updates.title.trim() }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.content !== undefined && { content: updates.content.trim() }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      })
      setPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)))
      return updated
    } catch (err) {
      const msg = (err as Error).message || 'Failed to update policy'
      setError(msg)
      throw err
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean): Promise<BrandPolicy> => {
    setError(null)
    try {
      const updated = await apiToggleActive(id, !currentStatus)
      setPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)))
      return updated
    } catch (err) {
      const msg = (err as Error).message || 'Failed to toggle policy status'
      setError(msg)
      throw err
    }
  }

  const remove = async (id: string): Promise<void> => {
    setError(null)
    try {
      await apiDeletePolicy(id)
      setPolicies((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      const msg = (err as Error).message || 'Failed to delete policy'
      setError(msg)
      throw err
    }
  }

  return {
    policies,
    loading,
    error,
    refresh: fetchPolicies,
    create,
    update,
    toggleActive,
    remove,
  }
}
