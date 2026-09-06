import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '../components/auth/AuthGuard'
import AppLayout from '../components/layout/AppLayout'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import ApiDocs from '../pages/ApiDocs'
import WhatsAppDemo from '../pages/WhatsAppDemo'
import Dashboard from '../pages/Dashboard'
import Upload from '../pages/Upload'
import Analysis from '../pages/Analysis'
import Simulate from '../pages/Simulate'
import DataQuality from '../pages/DataQuality'
import Agent from '../pages/Agent'
import Reports from '../pages/Reports'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/api-docs" element={<ApiDocs />} />
      <Route path="/whatsapp-demo" element={<WhatsAppDemo />} />

      {/* Protected app routes */}
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/agent" element={<Agent />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/simulate" element={<Simulate />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/data-quality" element={<DataQuality />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
