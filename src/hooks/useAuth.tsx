import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for persisted session in LocalStorage (legacy/hybrid)
        const storedUser = localStorage.getItem('crm_session_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // Supabase Session Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user?.email) {
                // Sync with local worker database by email
                // This assumes the user exists in local storage (created by Admin)
                const workers = await storage.getWorkers();
                const found = workers.find(w => w.email.toLowerCase() === session.user.email?.toLowerCase());

                if (found && found.active) {
                    setUser(found);
                    localStorage.setItem('crm_session_user', JSON.stringify(found));
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                localStorage.removeItem('crm_session_user');
            }
            setIsLoading(false);
        });

        // If no supabase session, check if we are truly loaded
        // (Listener fires initially with current session state)
        // But if supabase is not configured, we rely on LocalStorage fallback

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password?: string) => {
        // Database-only Authentication
        // Since we're using the workers table for user management,
        // we skip Supabase Auth and authenticate directly against the database

        try {
            const workers = await storage.getWorkers();
            let found = workers.find(w => w.email.toLowerCase() === email.toLowerCase());

            // BOOTSTRAP: Allow creation of initial admin if missing
            if (!found && email === 'admin@crm.com' && password === 'admin123') {
                const newAdmin: any = {
                    name: 'Administrador',
                    email: 'admin@crm.com',
                    role: 'ADMIN',
                    active: true,
                    password: 'admin123',
                    hourlyRate: 0,
                    phone: '',
                    joinedDate: new Date().toISOString()
                };

                const created = await storage.add('crm_workers', newAdmin);
                if (created) {
                    found = created;
                }
            }

            if (found && found.active) {
                // Password check logic
                if (password && found.password && found.password !== password) {
                    throw new Error('Contraseña incorrecta');
                }
                if (found.password && !password) {
                    throw new Error('Se requiere contraseña para este usuario');
                }

                setUser(found);
                localStorage.setItem('crm_session_user', JSON.stringify(found));
                return;
            } else {
                // Fallback for first run if no workers exist yet
                if (email === 'admin@crm.com') {
                    const admin = workers.find(w => w.role === 'ADMIN');
                    if (admin) {
                        setUser(admin);
                        localStorage.setItem('crm_session_user', JSON.stringify(admin));
                        return;
                    }
                }
                throw new Error('Usuario no encontrado o inactivo');
            }
        } catch (e) {
            throw e;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('crm_session_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
