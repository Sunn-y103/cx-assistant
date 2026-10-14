import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Brand } from '../types/database'
import { getUserBrands } from '../services/brands'

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
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBrands = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserBrands()
      setBrands(data)
      if (data.length > 0) {
        setSelectedBrand((current) => {
          if (current && data.some((b) => b.id === current.id)) return current
          return data[0]
        })
      } else {
        setSelectedBrand(null)
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
      value={{ brands, selectedBrand, setSelectedBrand, loading, error, refresh: loadBrands }}
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
