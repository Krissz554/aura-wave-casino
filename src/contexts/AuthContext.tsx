
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, username: string) => {
    console.log('🚀 Starting registration process...', { email, username })
    
    const redirectUrl = `${window.location.origin}/`
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
          },
        },
      })

      console.log('📧 Registration response:', { data, error })

      if (error) {
        console.error('❌ Registration error:', error)
        return { data, error }
      }

      // If registration is successful, ensure profile and stats are created
      if (data.user) {
        console.log('✅ User created successfully, ensuring profile and stats...')
        console.log('👤 User ID:', data.user.id)
        
        // Wait a bit for any triggers to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if profile was created by trigger
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        console.log('📋 Profile check result:', { profileData, profileError })
        
        if (profileError) {
          console.error('❌ Profile creation failed:', profileError)
          
          // Try to manually create the profile using the function
          console.log('🔧 Attempting manual profile creation...')
          const { data: manualProfile, error: manualError } = await supabase
            .rpc('create_user_profile_manual', {
              user_id: data.user.id,
              username: username
            })
          
          console.log('🔧 Manual profile creation result:', { manualProfile, manualError })
          
          if (manualError) {
            console.error('❌ Manual profile creation failed:', manualError)
            
            // Try direct insert as last resort
            console.log('🔧 Attempting direct profile insert...')
            const { data: directProfile, error: directError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username: username,
                registration_date: new Date().toISOString(),
                balance: 0,
                total_wagered: 0,
                total_profit: 0,
                last_claim_time: '1970-01-01T00:00:00Z',
                badges: ['welcome'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                available_cases: 0,
                total_cases_opened: 0
              })
              .select()
              .single()
            
            console.log('🔧 Direct profile insert result:', { directProfile, directError })
            
            if (directError) {
              console.error('❌ Direct profile insert failed:', directError)
              return { 
                data, 
                error: { 
                  message: 'Registration completed but profile setup failed. Please contact support.',
                  details: { profileError, manualError, directError }
                } 
              }
            } else {
              console.log('✅ Direct profile creation successful')
            }
          } else {
            console.log('✅ Manual profile creation successful')
          }
        } else {
          console.log('✅ Profile created successfully via trigger')
        }

        // Ensure user_level_stats exists
        console.log('📊 Ensuring user level stats exist...')
        const { data: statsResult, error: statsError } = await supabase
          .rpc('ensure_user_level_stats', { user_uuid: data.user.id })
        
        if (statsError) {
          console.error('❌ Stats creation failed:', statsError)
          // Don't fail registration for stats issues, just log
        } else {
          console.log('✅ User level stats ensured')
        }
      }

      return { data, error }
    } catch (err) {
      console.error('💥 Unexpected registration error:', err)
      return { 
        data: null, 
        error: { 
          message: 'An unexpected error occurred during registration',
          details: err
        } 
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      // Handle different types of errors
      if (error) {
        // These errors are generally safe to ignore
        const safeErrors = [
          'The user session was not found',
          'session_not_found',
          'no_session_found',
          'User not logged in'
        ]
        
        const isSafeError = safeErrors.some(safeError => 
          error.message?.toLowerCase().includes(safeError.toLowerCase())
        )
        
        if (!isSafeError) {
          console.warn('SignOut warning:', error.message)
        }
      }
      
    } catch (networkError) {
      // Network errors or other issues - we still want to clear local state
      console.warn('Network error during signOut:', networkError)
    }
    
    // Always clear local state regardless of Supabase response
    // The auth state listener will also handle cleanup when Supabase state changes
    setUser(null)
    setSession(null)
    
    // Clear any stored tokens from localStorage as a backup
    try {
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token')
    } catch (storageError) {
      // Ignore localStorage errors
      console.warn('Could not clear localStorage:', storageError)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
