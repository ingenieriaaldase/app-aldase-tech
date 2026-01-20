import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from './components/auth/RoleGuard';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ClientList from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import TimeTracking from './pages/TimeTracking';
import Accounting from './pages/Accounting';
import Workers from './pages/Workers';
import CalendarPage from './pages/Calendar';
import Meetings from './pages/Meetings';
import Analytics from './pages/Analytics';
import Leads from './pages/Leads';
import Marketing from './pages/Marketing';
import Settings from './pages/Settings';

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
                    <Routes>
                        <Route path="/login" element={<Login />} />

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

                            <Route path="workers" element={
                                <RoleGuard allowedRoles={['ADMIN']}>
                                    <Workers />
                                </RoleGuard>
                            } />

                            <Route path="settings" element={
                                <RoleGuard allowedRoles={['ADMIN']}>
                                    <Settings />
                                </RoleGuard>
                            } />
                        </Route>
                    </Routes>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
