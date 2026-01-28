import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define the Role types based on our database enum
export type UserRole = 'admin' | 'supervisor' | 'its' | 'capataz' | 'driver' | 'infra' | 'poda';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
}

interface AuthContextType {
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Auth check timed out, forcing loading to false');
                setLoading(false);
            }
        }, 10000); // Increased to 10s

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state change:', _event);
            if (mounted) {
                setSession(session);
                if (session) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    async function fetchProfile(userId: string) {
        try {
            const fetchQuery = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000)
            );

            // Race the DB against a 5s timeout
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await Promise.race([fetchQuery, timeoutPromise]);
            const { data, error } = result;

            if (error) {
                // Ignore "Row not found" if profile hasn't been created yet
                if (error.code === 'PGRST116') {
                    console.warn('Profile missing for user (PGRST116). User might need to be created in profiles table.');
                } else {
                    console.error('Error fetching profile:', error);
                }
            } else if (data) {
                setProfile(data as UserProfile);
            }
        } catch (e) {
            console.error('Profile fetch failed:', e);
            // Don't kill the app, just let it run without profile if needed
        } finally {
            setLoading(false);
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ session, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
