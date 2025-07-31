import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

interface DifficultyConfig {
  tilesPerRow: number;
  safeCount: number;
  mineCount: number;
  maxLevel: number;
  payoutMultipliers: number[];
}

const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    tilesPerRow: 4,
    safeCount: 3,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.32, 1.74, 2.28, 3.00, 3.94, 5.19, 6.83, 9.01, 11.95]
  },
  medium: {
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.48, 2.20, 3.26, 4.82, 7.12, 10.52, 15.56, 23.00, 33.99]
  },
  hard: {
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.98, 3.92, 7.78, 15.44, 30.64, 60.80, 120.80, 239.66, 475.40]
  },
  extreme: {
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    payoutMultipliers: [2.94, 8.64, 25.37, 74.51, 218.82, 643.10]
  }
};

function generateMinePositions(difficulty: string): number[][] {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const positions: number[][] = [];
  
  for (let level = 0; level < config.maxLevel; level++) {
    const levelMines: number[] = [];
    const availablePositions = Array.from({ length: config.tilesPerRow }, (_, i) => i);
    
    // Shuffle and pick mine positions
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }
    
    for (let i = 0; i < config.mineCount; i++) {
      levelMines.push(availablePositions[i]);
    }
    
    positions.push(levelMines.sort((a, b) => a - b));
  }
  
  return positions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { action, game_id, difficulty, bet_amount, tile_index } = requestBody;
    console.log(`🎯 Tower action: ${action} for user: ${user.id}`);
    console.log(`📝 Request body:`, requestBody);

    switch (action) {
      case 'start': {
        // Validate inputs
        if (!difficulty || !DIFFICULTY_CONFIGS[difficulty]) {
          return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!bet_amount || bet_amount <= 0) {
          return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (!profile || profile.balance < bet_amount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct bet amount immediately
        await supabase
          .from('profiles')
          .update({ balance: profile.balance - bet_amount })
          .eq('id', user.id);

        // Generate mine positions
        const minePositions = generateMinePositions(difficulty);
        const config = DIFFICULTY_CONFIGS[difficulty];

        // Create game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .insert({
            user_id: user.id,
            difficulty,
            bet_amount: bet_amount,
            max_level: config.maxLevel,
            mine_positions: minePositions,
            current_level: 0,
            status: 'active',
            current_multiplier: 1.0
          })
          .select()
          .single();

        if (gameError) {
          console.error('❌ Game creation error:', gameError);
          return new Response(JSON.stringify({ error: 'Failed to create game', details: gameError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`🎮 New Tower game started: ${game.id} for user: ${user.id}`);
        return new Response(JSON.stringify(game), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'select_tile': {
        if (!game_id || tile_index === undefined) {
          return new Response(JSON.stringify({ error: 'Missing game_id or tile_index' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
          .eq('user_id', user.id)
          .single();

        if (gameError || !game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (game.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Game is not active' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if tile selection is valid
        const currentLevelMines = game.mine_positions[game.current_level];
        const isMine = currentLevelMines.includes(tile_index);
        const config = DIFFICULTY_CONFIGS[game.difficulty];
        
        console.log(`🎯 Tile selected: ${tile_index}, Level: ${game.current_level}, Is Mine: ${isMine}`);

        if (isMine) {
          // Hit a mine - game over
          await supabase
            .from('tower_games')
            .update({
              status: 'lost',
              final_payout: 0
            })
            .eq('id', game_id);

          // Record loss in game history
          await supabase
            .from('game_history')
            .insert({
              user_id: user.id,
              game_type: 'tower',
              bet_amount: game.bet_amount,
              profit: -game.bet_amount,
              result: 'loss',
              game_data: {
                difficulty: game.difficulty,
                level_reached: game.current_level + 1,
                hit_mine: true
              }
            });

          console.log(`💥 Player hit mine at level ${game.current_level + 1}`);

          // Return updated game state
          const { data: updatedGame } = await supabase
            .from('tower_games')
            .select('*')
            .eq('id', game_id)
            .single();

          return new Response(JSON.stringify(updatedGame), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Safe tile - advance to next level
          const nextLevel = game.current_level + 1;
          const multiplier = config.payoutMultipliers[game.current_level];
          
          let newStatus = 'active';
          let finalPayout = 0;

          // Check if this was the last level
          if (nextLevel >= config.maxLevel) {
            newStatus = 'cashed_out';
            finalPayout = game.bet_amount * multiplier;
          }

          await supabase
            .from('tower_games')
            .update({
              current_level: nextLevel,
              current_multiplier: multiplier,
              status: newStatus,
              final_payout: newStatus === 'cashed_out' ? finalPayout : 0
            })
            .eq('id', game_id);

          // If game completed, credit the payout and record win
          if (newStatus === 'cashed_out') {
            // Credit user balance
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', user.id)
              .single();

            await supabase
              .from('profiles')
              .update({ 
                balance: (currentProfile?.balance || 0) + finalPayout
              })
              .eq('id', user.id);

            // Record win in game history
            await supabase
              .from('game_history')
              .insert({
                user_id: user.id,
                game_type: 'tower',
                bet_amount: game.bet_amount,
                profit: finalPayout - game.bet_amount,
                result: 'win',
                game_data: {
                  difficulty: game.difficulty,
                  level_reached: nextLevel,
                  multiplier,
                  completed: true
                }
              });

            console.log(`🏆 Player completed tower: ${finalPayout} at level ${nextLevel}`);
          } else {
            console.log(`✅ Player advanced to level ${nextLevel}, multiplier: ${multiplier}`);
          }

          // Return updated game state
          const { data: updatedGame } = await supabase
            .from('tower_games')
            .select('*')
            .eq('id', game_id)
            .single();

          return new Response(JSON.stringify(updatedGame), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'cash_out': {
        if (!game_id) {
          return new Response(JSON.stringify({ error: 'Missing game_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
          .eq('user_id', user.id)
          .single();

        if (gameError || !game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (game.status !== 'active' || game.current_level === 0) {
          return new Response(JSON.stringify({ error: 'Cannot cash out' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const config = DIFFICULTY_CONFIGS[game.difficulty];
        const multiplier = config.payoutMultipliers[game.current_level - 1];
        const payout = game.bet_amount * multiplier;

        // Update game status
        await supabase
          .from('tower_games')
          .update({
            status: 'cashed_out',
            final_payout: payout
          })
          .eq('id', game_id);

        // Credit user balance
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        await supabase
          .from('profiles')
          .update({ 
            balance: (currentProfile?.balance || 0) + payout
          })
          .eq('id', user.id);

        // Record win in game history
        await supabase
          .from('game_history')
          .insert({
            user_id: user.id,
            game_type: 'tower',
            bet_amount: game.bet_amount,
            profit: payout - game.bet_amount,
            result: 'win',
            game_data: {
              difficulty: game.difficulty,
              level_reached: game.current_level,
              multiplier,
              cashed_out: true
            }
          });

        console.log(`💰 Player cashed out: ${payout} at level ${game.current_level}`);

        // Return updated game state
        const { data: updatedGame } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
          .single();

        return new Response(JSON.stringify(updatedGame), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('❌ Tower error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
