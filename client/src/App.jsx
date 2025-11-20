import React from 'react'
import AppRoute from './routes/AppRoute.jsx'
import { ModalProvider } from './contexts/ModalContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { SidebarProvider } from './contexts/SidebarContext.jsx'
import NotificationSound from './components/NotificationSound'

export default function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
      <ModalProvider>
          <NotificationSound />
        <AppRoute />
      </ModalProvider>
      </SidebarProvider>
    </AuthProvider>
  )
}