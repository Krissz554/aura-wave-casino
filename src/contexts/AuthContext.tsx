
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

      // If registration is successful, the database trigger should handle profile creation
      if (data.user) {
        console.log('✅ User created successfully, trigger should handle profile creation')
        console.log('👤 User ID:', data.user.id)
        
        // Wait a moment for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Verify profile was created (optional check)
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', data.user.id)
            .single()
          
          if (profileData) {
            console.log('✅ Profile verified successfully:', profileData)
          } else if (profileError) {
            console.warn('⚠️ Profile verification failed, but this might be normal for unconfirmed users:', profileError)
            
            // Only attempt manual creation if it's a genuine missing profile issue
            if (profileError.code === 'PGRST116') { // No rows returned
              console.log('🔧 Attempting manual profile creation as fallback...')
              
              const { data: manualResult, error: manualError } = await supabase
                .rpc('create_user_profile_manual', {
                  user_id: data.user.id,
                  username: username
                })
              
              if (manualError) {
                console.error('❌ Manual profile creation failed:', manualError)
              } else {
                console.log('✅ Manual profile creation successful:', manualResult)
              }
            }
          }
        } catch (verificationError) {
          console.warn('⚠️ Profile verification threw error (might be normal):', verificationError)
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
    console.log('🔐 Starting sign in process...', { email })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Sign in error:', error)
      } else {
        console.log('✅ Sign in successful:', data.user?.id)
      }
      
      return { data, error }
    } catch (err) {
      console.error('💥 Unexpected sign in error:', err)
      return {
        data: null,
        error: {
          message: 'An unexpected error occurred during sign in',
          details: err
        }
      }
    }
  }

  const signOut = async () => {
    console.log('🚪 Starting sign out process...')
    
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
          console.warn('⚠️ SignOut warning:', error.message)
        } else {
          console.log('ℹ️ Safe sign out message:', error.message)
        }
      } else {
        console.log('✅ Sign out successful')
      }
      
    } catch (networkError) {
      // Network errors or other issues - we still want to clear local state
      console.warn('⚠️ Network error during signOut:', networkError)
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
      console.warn('⚠️ Could not clear localStorage:', storageError)
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
