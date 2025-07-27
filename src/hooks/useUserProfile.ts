
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  username: string
  registration_date: string
  balance: number
  level: number
  xp: number
  current_level: number
  current_xp: number
  xp_to_next_level: number
  lifetime_xp: number
  total_wagered: number
  total_profit: number
  last_claim_time: string
  badges: string[]
  gameStats: {
    coinflip: { wins: number; losses: number; profit: number }
    crash: { wins: number; losses: number; profit: number }
    roulette: { wins: number; losses: number; profit: number }
    tower: { wins: number; losses: number; profit: number }
  }
}

export function useUserProfile() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Optimized fetch function with concurrent queries
  const fetchUserProfile = useCallback(async () => {
    if (!user) return

    try {
      // Fetch profile and level stats concurrently
      const [profileResult, levelStatsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_level_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ])

      if (!mountedRef.current) return

      const profile = profileResult.data
      const levelStats = levelStatsResult.data

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        throw profileResult.error
      }

      if (levelStatsResult.error && levelStatsResult.error.code !== 'PGRST116') {
        throw levelStatsResult.error
      }

      // If no level stats exist, create them
      if (!levelStats) {
        console.log('🆕 Creating initial user level stats for user:', user.id)
        const { data: newLevelStats, error: createError } = await supabase
          .from('user_level_stats')
          .insert({ user_id: user.id })
          .select('*')
          .single()
        
        if (createError) {
          console.error('Error creating level stats:', createError)
          throw createError
        }
        
        // Use the newly created stats
        const userProfile: UserProfile = {
          ...profile,
          current_level: newLevelStats.current_level,
          current_xp: newLevelStats.current_level_xp,
          xp_to_next_level: newLevelStats.xp_to_next_level,
          lifetime_xp: newLevelStats.lifetime_xp,
          total_wagered: newLevelStats.total_wagered,
          total_profit: newLevelStats.total_profit,
          gameStats: {
            coinflip: {
              wins: newLevelStats.coinflip_wins,
              losses: Math.max(0, newLevelStats.coinflip_games - newLevelStats.coinflip_wins),
              profit: newLevelStats.coinflip_profit,
            },
            crash: {
              wins: newLevelStats.crash_wins,
              losses: Math.max(0, newLevelStats.crash_games - newLevelStats.crash_wins),
              profit: newLevelStats.crash_profit,
            },
            roulette: {
              wins: newLevelStats.roulette_wins,
              losses: Math.max(0, newLevelStats.roulette_games - newLevelStats.roulette_wins),
              profit: newLevelStats.roulette_profit,
            },
            tower: {
              wins: newLevelStats.tower_wins,
              losses: Math.max(0, newLevelStats.tower_games - newLevelStats.tower_wins),
              profit: newLevelStats.tower_profit,
            },
          },
        }
        
        setUserData(userProfile)
        return
      }

      // Combine profile data with level stats
      const userProfile: UserProfile = {
        ...profile,
        current_level: levelStats.current_level,
        current_xp: levelStats.current_level_xp,
        xp_to_next_level: levelStats.xp_to_next_level,
        lifetime_xp: levelStats.lifetime_xp,
        total_wagered: levelStats.total_wagered,
        total_profit: levelStats.total_profit,
        gameStats: {
          coinflip: {
            wins: levelStats.coinflip_wins,
            losses: Math.max(0, levelStats.coinflip_games - levelStats.coinflip_wins),
            profit: levelStats.coinflip_profit,
          },
          crash: {
            wins: levelStats.crash_wins,
            losses: Math.max(0, levelStats.crash_games - levelStats.crash_wins),
            profit: levelStats.crash_profit,
          },
          roulette: {
            wins: levelStats.roulette_wins,
            losses: Math.max(0, levelStats.roulette_games - levelStats.roulette_wins),
            profit: levelStats.roulette_profit,
          },
          tower: {
            wins: levelStats.tower_wins,
            losses: Math.max(0, levelStats.tower_games - levelStats.tower_wins),
            profit: levelStats.tower_profit,
          },
        },
      }

      setUserData(userProfile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    mountedRef.current = true

    if (!user) {
      setUserData(null)
      setLoading(false)
      return
    }

    fetchUserProfile()
    
    // Single optimized subscription for all user data updates
    console.log('🔗 Setting up optimized user data subscription for user:', user.id)
    
    subscriptionRef.current = supabase
      .channel(`user_data_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 USER STATS UPDATE RECEIVED:', payload)
          
          if (payload.new && mountedRef.current) {
            const newStats = payload.new as any
            setUserData(prev => {
              if (!prev) return null
              return {
                ...prev,
                current_level: newStats.current_level,
                current_xp: newStats.current_level_xp,
                xp_to_next_level: newStats.xp_to_next_level,
                lifetime_xp: newStats.lifetime_xp,
                total_wagered: newStats.total_wagered,
                total_profit: newStats.total_profit,
                gameStats: {
                  coinflip: {
                    wins: newStats.coinflip_wins,
                    losses: Math.max(0, newStats.coinflip_games - newStats.coinflip_wins),
                    profit: newStats.coinflip_profit,
                  },
                  crash: {
                    wins: newStats.crash_wins,
                    losses: Math.max(0, newStats.crash_games - newStats.crash_wins),
                    profit: newStats.crash_profit,
                  },
                  roulette: {
                    wins: newStats.roulette_wins,
                    losses: Math.max(0, newStats.roulette_games - newStats.roulette_wins),
                    profit: newStats.roulette_profit,
                  },
                  tower: {
                    wins: newStats.tower_wins,
                    losses: Math.max(0, newStats.tower_games - newStats.tower_wins),
                    profit: newStats.tower_profit,
                  },
                },
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('👤 PROFILE UPDATE RECEIVED:', payload)
          
          if (payload.new && payload.old && mountedRef.current) {
            if (payload.new.balance !== payload.old.balance) {
              console.log('✅ UPDATING BALANCE FROM', payload.old.balance, 'TO', payload.new.balance)
              setUserData(prev => {
                if (!prev) return null
                return {
                  ...prev,
                  balance: payload.new.balance,
                  username: payload.new.username,
                  badges: payload.new.badges,
                }
              })
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Optimized user data subscription status:', status)
      })

    return () => {
      mountedRef.current = false
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up optimized user data subscription')
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [user, fetchUserProfile])

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userData) return

    try {
      // Only update profile table for profile-specific data
      const profileUpdates: any = {}
      if (updates.balance !== undefined) profileUpdates.balance = updates.balance
      if (updates.username !== undefined) profileUpdates.username = updates.username
      if (updates.badges !== undefined) profileUpdates.badges = updates.badges
      if (updates.last_claim_time !== undefined) profileUpdates.last_claim_time = updates.last_claim_time
      
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString()
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id)

        if (profileError) throw profileError
      }

      // Refresh profile data to get latest state
      await fetchUserProfile()
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  return {
    userData,
    loading,
    updateUserProfile,
    refetch: fetchUserProfile,
  }
}
