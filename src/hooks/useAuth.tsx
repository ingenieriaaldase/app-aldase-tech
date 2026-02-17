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
        // We keep this to sync if Supabase Auth is used in parallel or for future proofing,
        // but we guard against unwanted wipe.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth Event:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                // Try to match by ID first (robust), then email (legacy)
                const workers = await storage.getWorkers();
                let found = workers.find(w => w.id === session.user.id);

                if (!found && session.user.email) {
                    found = workers.find(w => w.email.toLowerCase() === session.user.email!.toLowerCase());
                }

                if (found && found.active) {
                    setUser(found);
                    localStorage.setItem('crm_session_user', JSON.stringify(found));
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                localStorage.removeItem('crm_session_user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password?: string) => {
        if (!password) throw new Error('Contraseña requerida');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Fetch enriched profile from workers table
            if (data.user) {
                const workers = await storage.getWorkers();
                const found = workers.find(w => w.email.toLowerCase() === email.toLowerCase());

                if (found) {
                    // Check if active
                    if (!found.active) {
                        await supabase.auth.signOut();
                        throw new Error('Usuario inactivo. Contacta con el administrador.');
                    }
                    setUser(found);
                    localStorage.setItem('crm_session_user', JSON.stringify(found));
                } else {
                    // Fallback if worker profile doesn't exist yet but auth does?
                    // Should theoretically not happen if creating properly.
                    // But maybe we render a basic user from auth metadata?
                    // For now, let's treat it as a valid login but maybe warn?
                    setUser({
                        id: data.user.id,
                        email: data.user.email || '',
                        name: data.user.user_metadata?.name || 'Usuario',
                        role: 'WORKER',
                        active: true,
                        hourlyRate: 0,
                        joinedDate: new Date().toISOString()
                    } as any);
                }
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
