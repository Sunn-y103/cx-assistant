import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrandProvider } from './context/BrandContext'
import InboxPage from './pages/InboxPage'
import CustomerDetailsPage from './pages/CustomerDetailsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import LoginPage from './pages/LoginPage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes stale time for instant cache hits
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * App — root router.
 * Wrapped with QueryClientProvider and BrandProvider to provide fast cached data.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BrandProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/customers" element={<CustomerDetailsPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            {/* Default redirect to inbox */}
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </BrandProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
