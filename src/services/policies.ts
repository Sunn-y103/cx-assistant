/**
 * policies.ts
 * Service layer for brand_policies (knowledge-base) records.
 * All queries are scoped to the caller's brand via RLS and brand_id filter.
 */

import { supabase, isConfigured } from '../lib/supabase'
import type { BrandPolicy } from '../types/database'
import { MOCK_POLICIES } from '../lib/mockData'

// In-memory store for fallback/demo sessions
let localPolicies: BrandPolicy[] = [...MOCK_POLICIES]

/** Fetch all policies for a brand (both active and inactive). */
export async function getPolicies(brandId: string): Promise<BrandPolicy[]> {
  if (!brandId) return []

  if (!isConfigured) {
    return localPolicies
      .filter((p) => p.brand_id === brandId)
      .sort((a, b) => a.title.localeCompare(b.title))
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .select('*')
      .eq('brand_id', brandId)
      .order('title', { ascending: true })

    if (error) throw error
    if (data && data.length > 0) return data as BrandPolicy[]

    // Fallback if brand has no rows in DB yet or table is unseeded
    const fallback = localPolicies.filter((p) => p.brand_id === brandId)
    return fallback
  } catch (err) {
    console.warn('[policies] Falling back to local data:', err)
    return localPolicies
      .filter((p) => p.brand_id === brandId)
      .sort((a, b) => a.title.localeCompare(b.title))
  }
}

/** Fetch a single policy by ID. */
export async function getPolicy(id: string): Promise<BrandPolicy | null> {
  if (!isConfigured) {
    return localPolicies.find((p) => p.id === id) ?? null
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as BrandPolicy
  } catch (err) {
    console.warn('[policies] Falling back to local policy lookup:', err)
    return localPolicies.find((p) => p.id === id) ?? null
  }
}

/** Create a new policy. */
export async function createPolicy(
  policy: Omit<BrandPolicy, 'id' | 'created_at' | 'updated_at'>,
): Promise<BrandPolicy> {
  const now = new Date().toISOString()

  if (!isConfigured) {
    const newPolicy: BrandPolicy = {
      ...policy,
      id: 'p-' + Math.random().toString(36).slice(2, 9),
      created_at: now,
      updated_at: now,
    }
    localPolicies = [newPolicy, ...localPolicies]
    return newPolicy
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .insert(policy)
      .select()
      .single()

    if (error) throw error
    return data as BrandPolicy
  } catch (err) {
    console.warn('[policies] Insert failed, creating in local fallback:', err)
    const newPolicy: BrandPolicy = {
      ...policy,
      id: 'p-' + Math.random().toString(36).slice(2, 9),
      created_at: now,
      updated_at: now,
    }
    localPolicies = [newPolicy, ...localPolicies]
    return newPolicy
  }
}

/** Update an existing policy. */
export async function updatePolicy(
  id: string,
  updates: Partial<Omit<BrandPolicy, 'id' | 'brand_id' | 'created_at' | 'updated_at'>>,
): Promise<BrandPolicy> {
  const now = new Date().toISOString()

  if (!isConfigured) {
    const idx = localPolicies.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Policy not found')
    localPolicies[idx] = {
      ...localPolicies[idx],
      ...updates,
      updated_at: now,
    }
    return localPolicies[idx]
  }

  try {
    const { data, error } = await supabase
      .from('brand_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as BrandPolicy
  } catch (err) {
    console.warn('[policies] Update failed, updating in local fallback:', err)
    const idx = localPolicies.findIndex((p) => p.id === id)
    if (idx !== -1) {
      localPolicies[idx] = {
        ...localPolicies[idx],
        ...updates,
        updated_at: now,
      }
      return localPolicies[idx]
    }
    throw err
  }
}

/** Delete a policy. */
export async function deletePolicy(id: string): Promise<void> {
  if (!isConfigured) {
    localPolicies = localPolicies.filter((p) => p.id !== id)
    return
  }

  try {
    const { error } = await supabase
      .from('brand_policies')
      .delete()
      .eq('id', id)

    if (error) throw error
    localPolicies = localPolicies.filter((p) => p.id !== id)
  } catch (err) {
    console.warn('[policies] Delete failed, removing from local fallback:', err)
    localPolicies = localPolicies.filter((p) => p.id !== id)
  }
}

/** Toggle policy active status. */
export async function togglePolicyActive(id: string, is_active: boolean): Promise<BrandPolicy> {
  return updatePolicy(id, { is_active })
}
