import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Brand } from '../types/database'
import { getUserBrands } from '../services/brands'

import { MOCK_BRANDS } from '../lib/mockData'

const BRAND_STORAGE_KEY = 'datastraw_selected_brand_id'

interface BrandCtx {
  brands: Brand[]
  selectedBrand: Brand | null
  setSelectedBrand: (b: Brand) => void
  loading: boolean
  error: string | null
  refresh: () => void
}

const BrandContext = createContext<BrandCtx | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>(MOCK_BRANDS)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem(BRAND_STORAGE_KEY)
        if (savedId) {
          const match = MOCK_BRANDS.find((b) => b.id === savedId)
          if (match) return match
        }
      } catch {
        // Ignore localStorage error
      }
    }
    return MOCK_BRANDS[0] ?? null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSetSelectedBrand = (brand: Brand) => {
    setSelectedBrand(brand)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BRAND_STORAGE_KEY, brand.id)
      } catch {
        // Ignore localStorage error
      }
    }
  }

  const loadBrands = async () => {
    setError(null)
    try {
      const data = await getUserBrands()
      if (data && data.length > 0) {
        setBrands(data)
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(BRAND_STORAGE_KEY) : null
        setSelectedBrand((current) => {
          const targetId = current?.id || savedId
          const match = data.find((b) => b.id === targetId)
          return match || data[0]
        })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrands()
  }, [])

  return (
    <BrandContext.Provider
      value={{
        brands,
        selectedBrand,
        setSelectedBrand: handleSetSelectedBrand,
        loading,
        error,
        refresh: loadBrands,
      }}
    >
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
