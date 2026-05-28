import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";

import { AuthProvider } from './contexts/AuthContext';
import { DemoAuthProvider } from './contexts/DemoAuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'sonner';
import LoadingSpinner from './components/features/LoadingSpinner';

const MainLayout            = lazy(() => import('./layouts/MainLayout'));
const Admin                 = lazy(() => import('./pages/Admin'));
const Index                 = lazy(() => import('./pages/Index'));
const Login                 = lazy(() => import('./pages/Login'));
const Ventas                = lazy(() => import('./pages/Ventas'));
const RepMerch              = lazy(() => import('./pages/RepMerch'));
const Inventario            = lazy(() => import('./pages/Inventario'));
const Consumo               = lazy(() => import('./pages/Consumo'));
const CajaC                 = lazy(() => import('./pages/CajaC'));
const Auditoria             = lazy(() => import('./pages/Auditoria'));
const ReporteIncidencia     = lazy(() => import('./pages/ReporteIncidencia'));
const DashboardSemaforo     = lazy(() => import('./pages/DashboardSemaforo'));
const DashboardIncidencias  = lazy(() => import('./pages/DashboardIncidencias'));
const ReportesAuditoria     = lazy(() => import('./pages/ReportesAuditoria'));

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const GlobalLoading = () => (
    <div className="flex h-screen w-full items-center justify-center bg-azul-primary text-naranja-primary">
        <LoadingSpinner text="Cargando Aplicación..." />
    </div>
);

const AppRoutes = () => (
    <Suspense fallback={<GlobalLoading />}>
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/"                  element={<Index />} />
                <Route path="/ventas"            element={<Ventas />} />
                <Route path="/repmerch"          element={<RepMerch />} />
                <Route path="/inventario"        element={<Inventario />} />
                <Route path="/consumo"           element={<Consumo />} />
                <Route path="/CajaC"             element={<CajaC />} />
                <Route path="/admin"             element={<Admin />} />
                <Route path="/dashboard-semaforo" element={<DashboardSemaforo />} />
                <Route path="/auditoria"         element={<Auditoria />} />
                <Route path="/reportes"          element={<ReportesAuditoria />} />
                <Route path="/incidencias/nuevo" element={<ReporteIncidencia />} />
                <Route path="/incidencias"       element={<DashboardIncidencias />} />
            </Route>
            <Route path="/login" element={<Navigate to="/" />} />
        </Routes>
    </Suspense>
);

function App() {
    // Demo/portfolio mode: skip Azure AD entirely and inject a mock admin user.
    if (DEMO_MODE) {
        return (
            <BrowserRouter>
                <DemoAuthProvider>
                    <NotificationProvider>
                        <Toaster richColors position="top-right" />
                        <AppRoutes />
                    </NotificationProvider>
                </DemoAuthProvider>
            </BrowserRouter>
        );
    }

    // Production mode: requires real Azure AD authentication via MSAL.
    return (
        <BrowserRouter>
            <AuthenticatedTemplate>
                <AuthProvider>
                    <NotificationProvider>
                        <Toaster richColors position="top-right" />
                        <AppRoutes />
                    </NotificationProvider>
                </AuthProvider>
            </AuthenticatedTemplate>

            <UnauthenticatedTemplate>
                <Suspense fallback={<GlobalLoading />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="*"      element={<Navigate to="/login" />} />
                    </Routes>
                </Suspense>
            </UnauthenticatedTemplate>
        </BrowserRouter>
    );
}

export default App;
