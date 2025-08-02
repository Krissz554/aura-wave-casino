// Fix for roulette-engine completeRound function - Use complete_roulette_round database function
// Replace the existing completeRound function with this simplified version

async function completeRound(supabase: any, round: any) {
  console.log(`🏁 Completing round ${round.id} with result: ${round.result_color} ${round.result_slot}`);
  console.log('🔍 Using new complete_roulette_round function for comprehensive processing');

  try {
    // Use the database function to handle all round completion logic including XP
    const { data: result, error } = await supabase.rpc('complete_roulette_round', {
      p_round_id: round.id
    });

    if (error) {
      console.error('❌ complete_roulette_round failed:', error);
      throw new Error(`Round completion failed: ${error.message}`);
    }

    if (!result || !result.success) {
      console.error('❌ complete_roulette_round returned failure:', result);
      throw new Error(`Round completion failed: ${result?.error || 'Unknown error'}`);
    }

    console.log('✅ Round completion successful:', {
      bets_processed: result.bets_processed,
      winners_processed: result.winners_processed,
      xp_awarded: result.xp_awarded,
      result_color: result.result_color,
      result_slot: result.result_slot
    });

    // Pay winners - the database function handles XP, but we still need to handle balance updates
    const { data: bets } = await supabase
      .from('roulette_bets')
      .select('*')
      .eq('round_id', round.id);

    if (bets && bets.length > 0) {
      console.log(`💰 Processing balance updates for ${bets.length} bets`);
      
      for (const bet of bets) {
        const isWinner = bet.bet_color === round.result_color;
        
        if (isWinner) {
          // Pay the winner (XP is already handled by complete_roulette_round)
          const { error: payError } = await supabase
            .from('profiles')
            .update({ 
              balance: supabase.raw(`balance + ${bet.potential_payout}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', bet.user_id);

          if (payError) {
            console.error(`❌ Failed to pay winner ${bet.user_id}:`, payError);
          } else {
            console.log(`💰 Paid winner ${bet.user_id}: $${bet.potential_payout}`);
          }
        }
      }
    }

    console.log(`✅ Round ${round.id} completed successfully with ${result.bets_processed} bets and ${result.xp_awarded} total XP awarded`);
    
  } catch (error) {
    console.error('❌ Error in completeRound:', error);
    
    // Fallback: Mark round as completed even if processing fails
    await supabase
      .from('roulette_rounds')
      .update({ status: 'completed' })
      .eq('id', round.id);
      
    throw error;
  }
}