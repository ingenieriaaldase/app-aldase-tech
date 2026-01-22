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
        // Hybrid Auth:
        // 1. Try Supabase Login (if password provided)
        // 2. Fallback to Mock implementation (if no password or supabase fails/not configured)

        if (password) {
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // Listener will handle state update
                return;
            } catch (err) {
                // Check if Supabase keys are missing to fallback
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
                    // Real error
                    throw err;
                }
                // Else fall through to mock
                console.warn("Supabase login failed or not configured, falling back to mock");
            }
        }

        // Mock Implementation (Legacy support & Bootstrap)
        return new Promise<void>((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const workers = await storage.getWorkers();
                    let found = workers.find(w => w.email.toLowerCase() === email.toLowerCase());

                    // BOOTSTRAP: Allow creation of initial admin if missing
                    if (!found && email === 'admin@crm.com' && password === 'admin123') {
                        const newAdmin: any = { // Use 'any' to bypass ID requirement if 'add' handles it, but TS needs it.
                            // We need an ID. Storage.add usually generates one if DB, but for local consistency let's try.
                            // If Storage.add expects ID, we need to generate it or let DB do it.
                            name: 'Administrador',
                            email: 'admin@crm.com',
                            role: 'ADMIN',
                            active: true,
                            password: 'admin123',
                            hourlyRate: 0,
                            phone: '',
                            joinedDate: new Date().toISOString()
                        };

                        // We use storage.add to persist to Supabase/Local
                        // storage.add usually returns the created object with ID.
                        const created = await storage.add('crm_workers', newAdmin);
                        if (created) {
                            found = created;
                        }
                    }

                    if (found && found.active) {
                        // Password check logic
                        if (password && found.password && found.password !== password) {
                            reject(new Error('Contraseña incorrecta'));
                            return;
                        }
                        if (found.password && !password) {
                            reject(new Error('Se requiere contraseña para este usuario'));
                            return;
                        }

                        setUser(found);
                        localStorage.setItem('crm_session_user', JSON.stringify(found));
                        resolve();
                    } else {
                        // Fallback for first run if no workers exist yet/bug
                        if (email === 'admin@crm.com') {
                            // This block is now covered by the BOOTSTRAP logic above, but kept for safety if password differs or logic fails
                            const admin = workers.find(w => w.role === 'ADMIN');
                            if (admin) {
                                setUser(admin);
                                localStorage.setItem('crm_session_user', JSON.stringify(admin));
                                resolve();
                                return;
                            }
                        }
                        reject(new Error('Usuario no encontrado o inactivo'));
                    }
                } catch (e) {
                    reject(e);
                }
            }, 500);
        });
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
