import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Clock,
    Receipt,
    CalendarDays,
    Presentation,
    BarChart3,
    Settings,
    LogOut,
    UserCircle,
    Target,
    Megaphone,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { ThemeToggle } from '../components/ThemeToggle';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/logo.png';
import logoDark from '../assets/logo-white.png';

const SidebarItem = ({ icon: Icon, label, path, active }: { icon: any, label: string, path: string, active: boolean }) => (
    <Link
        to={path}
        className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors mb-1",
            active
                ? "bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/20 dark:text-primary-400"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        )}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </Link>
);

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const location = useLocation();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Target, label: 'Oportunidades', path: '/leads' },
        { icon: Megaphone, label: 'Marketing', path: '/marketing' },
        { icon: Users, label: 'Clientes', path: '/clients' },
        { icon: Briefcase, label: 'Proyectos', path: '/projects' },
        { icon: Clock, label: 'Horas', path: '/time-tracking' },
        { icon: Receipt, label: 'Contabilidad', path: '/accounting' },
        { icon: CalendarDays, label: 'Calendario', path: '/calendar' },
        { icon: Presentation, label: 'Reuniones', path: '/meetings' },
        { icon: BarChart3, label: 'Análisis', path: '/analytics' },
    ];

    if (user?.role === 'ADMIN') {
        navItems.push({ icon: Settings, label: 'Configuración', path: '/settings' });
        navItems.push({ icon: Settings, label: 'Trabajadores', path: '/workers' });
        navItems.push({ icon: UserCircle, label: 'Usuarios', path: '/admin/users' });
    }

    // Handle Closing on Mobile Navigation
    const handleNavClick = () => {
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed left-0 top-0 transition-transform duration-300 z-30",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-center flex-1">
                        <img src={isDark ? logoDark : logoLight} alt="ALDASE TECH" className="h-20 object-contain transition-all hover:scale-105" />
                    </div>
                    {/* Close button for mobile inside sidebar (optional, overlay handles it predominantly but good for a11y) */}
                    <button onClick={onClose} className="md:hidden p-1 text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    {navItems.map((item) => (
                        <div key={item.path} onClick={handleNavClick}>
                            <SidebarItem
                                icon={item.icon}
                                label={item.label}
                                path={item.path}
                                active={location.pathname.startsWith(item.path)}
                            />
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3 px-3 py-2">
                        <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                            <UserCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role?.toLowerCase()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default function MainLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between md:justify-end px-4 md:px-8 sticky top-0 z-10 transition-colors duration-300 gap-4">
                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-sm text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Cerrar Sesión</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
