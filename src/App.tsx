import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BrandProvider } from './context/BrandContext'
import InboxPage from './pages/InboxPage'
import CustomerDetailsPage from './pages/CustomerDetailsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import LoginPage from './pages/LoginPage'

/**
 * App — root router.
 * Wrapped with BrandProvider to provide selected brand state across views.
 */
export default function App() {
  return (
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
  )
}
