import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { mapKeysToCamel } from '../services/storage';
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
        console.log('[Auth] Handling session for:', authUser.email);

        let found = null;
        try {
            // OPTIMIZED: Fetch only the specific worker instead of all
            // Try by ID first with 5s timeout
            const fetchPromise = supabase
                .from('workers')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle(); // Use maybeSingle to avoid 406/JSON errors

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout fetching worker profile')), 5000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) {
                console.error('[Auth] DB Error:', error);
                // Don't throw, let fallback handle it
            } else {
                found = data;
            }

            console.log('[Auth] Search by ID result:', found ? 'Found' : 'Not Found');

            // If not found by ID, try by Email (Legacy/Migration)
            if (!found && authUser.email) {
                console.log('[Auth] Searching by Email...');
                const emailFetch = supabase
                    .from('workers')
                    .select('*')
                    .eq('email', authUser.email.toLowerCase())
                    .maybeSingle();

                const { data: foundByEmail } = await Promise.race([
                    emailFetch,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout email fetch')), 5000))
                ]) as any;

                if (foundByEmail) found = foundByEmail;
                console.log('[Auth] Search by Email result:', foundByEmail ? 'Found' : 'Not Found');
            }

            if (found) {
                if (!found.active) {
                    console.warn('[Auth] User found but INACTIVE. Blocking access.');
                    await supabase.auth.signOut();
                    throw new Error('Tu cuenta ha sido desactivada. Contacta con administración.');
                }

                console.log('[Auth] User linked to Worker. Setting session.');
                const userWithRole = mapKeysToCamel(found) as User; // Ensure keys are camelCase
                setUser(userWithRole);
                localStorage.setItem('crm_session_user', JSON.stringify(userWithRole));
            } else {
                console.log('[Auth] No linked worker (or timeout). Creating fallback session.');
                // Fallback: Create temporary profile from Auth Data
                // CRITICAL: Grant ADMIN role if email matches known admin or if it's the first migration
                const isAdminEmail = authUser.email?.toLowerCase().includes('admin') ||
                    authUser.email?.toLowerCase().includes('ingenieria'); // Added heuristic for user's email

                const fallbackUser: any = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: authUser.user_metadata?.name || 'Usuario',
                    surnames: '',
                    role: isAdminEmail ? 'ADMIN' : 'WORKER',
                    active: true,
                    hourlyRate: 0,
                    joinedDate: new Date().toISOString()
                };

                console.log('[Auth] Fallback User:', fallbackUser);
                setUser(fallbackUser);
                localStorage.setItem('crm_session_user', JSON.stringify(fallbackUser));
            }
        } catch (err) {
            console.error('[Auth] Error/Timeout handling user session:', err);
            // Ensure we fallback even on timeout error!
            const isAdminEmail = authUser.email?.toLowerCase().includes('admin') ||
                authUser.email?.toLowerCase().includes('ingenieria');

            const fallbackUser: any = {
                id: authUser.id,
                email: authUser.email || '',
                name: authUser.user_metadata?.name || 'Usuario (Offline Mode)',
                surnames: '',
                role: isAdminEmail ? 'ADMIN' : 'WORKER',
                active: true,
                hourlyRate: 0,
                joinedDate: new Date().toISOString()
            };
            setUser(fallbackUser);
            localStorage.setItem('crm_session_user', JSON.stringify(fallbackUser));
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
