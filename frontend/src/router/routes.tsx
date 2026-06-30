import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '../components/auth/AuthGuard'
import AppLayout from '../components/layout/AppLayout'
import Login from '../pages/Login'
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
      <Route path="/login" element={<Login />} />
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
