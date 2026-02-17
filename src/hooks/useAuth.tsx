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
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                localStorage.removeItem('crm_session_user');
            }
        }

        // Mark as loaded immediately if we have data, or wait for Supabase?
        // Since we prioritize LocalStorage for this custom auth:
        setIsLoading(false);

        // Supabase Session Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth Event:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                await handleUserSession(session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                localStorage.removeItem('crm_session_user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUserSession = async (authUser: any) => {
        try {
            // Try to match by ID first (robust), then email (legacy)
            const workers = await storage.getWorkers();
            let found = workers.find(w => w.id === authUser.id);

            if (!found && authUser.email) {
                found = workers.find(w => w.email.toLowerCase() === authUser.email.toLowerCase());
            }

            if (found && found.active) {
                setUser(found);
                localStorage.setItem('crm_session_user', JSON.stringify(found));
            } else {
                // Fallback: Create temporary profile from Auth Data
                // CRITICAL: Grant ADMIN role if email matches known admin or if it's the first migration
                const isAdminEmail = authUser.email?.toLowerCase().includes('admin'); // Simple heuristic for now, or strict check 'admin@crm.com'

                const fallbackUser: any = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: authUser.user_metadata?.name || 'Usuario',
                    surnames: '',
                    role: isAdminEmail ? 'ADMIN' : 'WORKER', // Allow Admin to access migration
                    active: true,
                    hourlyRate: 0,
                    joinedDate: new Date().toISOString()
                };

                console.log('User not linked in DB. Using Fallback:', fallbackUser);
                setUser(fallbackUser);
                localStorage.setItem('crm_session_user', JSON.stringify(fallbackUser));
            }
        } catch (err) {
            console.error('Error handling user session:', err);
        }
    };

    const login = async (email: string, password?: string) => {
        if (!password) throw new Error('Contraseña requerida');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data.user) {
                await handleUserSession(data.user);
            }
        } catch (e: any) {
            console.error('Login error:', e);
            throw new Error(e.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : e.message);
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
