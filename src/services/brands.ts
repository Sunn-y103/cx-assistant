/**
 * brands.ts
 * Service layer for brand lookup.
 * RLS ensures only brands the caller has memberships in are returned.
 */

import { supabase, isConfigured } from '../lib/supabase'
import type { Brand } from '../types/database'
import { MOCK_BRANDS } from '../lib/mockData'

export async function getUserBrands(): Promise<Brand[]> {
  if (!isConfigured) {
    return MOCK_BRANDS
  }
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name')
    if (error) throw error
    if (data && data.length > 0) return data
  } catch (err) {
    console.warn('[brands] Falling back to default brands:', err)
  }
  return MOCK_BRANDS
}
