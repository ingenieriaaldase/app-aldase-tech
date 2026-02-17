
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from './components/auth/RoleGuard';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages for Performance Optimization
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectList = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ClientList = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const Accounting = lazy(() => import('./pages/Accounting'));

const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leads = lazy(() => import('./pages/Leads'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Settings = lazy(() => import('./pages/Settings'));
const DataMigration = lazy(() => import('./components/DataMigration'));

import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load auth pages
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/auth/UpdatePassword'));

// Loading Fallback
const LoadingFallback = () => (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <AuthProvider>
                    <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/update-password" element={<UpdatePassword />} />
                                <Route path="/migrate" element={
                                    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                                        <div className="w-full max-w-2xl">
                                            <DataMigration />
                                            <div className="mt-4 text-center">
                                                <a href="/login" className="text-sm text-slate-500 hover:text-slate-800">
                                                    Volver al Login
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                } />

                                <Route path="/" element={
                                    <ProtectedRoute>
                                        <MainLayout />
                                    </ProtectedRoute>
                                }>
                                    <Route index element={<Navigate to="/dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard />} />

                                    <Route path="projects" element={<ProjectList />} />
                                    <Route path="projects/:id" element={<ProjectDetail />} />

                                    <Route path="clients" element={<ClientList />} />
                                    <Route path="clients/:id" element={<ClientDetail />} />

                                    <Route path="time-tracking" element={<TimeTracking />} />

                                    <Route path="accounting" element={
                                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                                            <Accounting />
                                        </RoleGuard>
                                    } />

                                    <Route path="calendar" element={<CalendarPage />} />
                                    <Route path="meetings" element={<Meetings />} />
                                    <Route path="leads" element={<Leads />} />
                                    <Route path="marketing" element={<Marketing />} />
                                    <Route path="analytics" element={<Analytics />} />

                                    <Route path="admin/users" element={
                                        <RoleGuard allowedRoles={['ADMIN']}>
                                            <AdminUsers />
                                        </RoleGuard>
                                    } />

                                    <Route path="settings" element={<Settings />} />
                                </Route>
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;

