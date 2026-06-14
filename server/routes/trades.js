const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// @route POST /api/trades/propose
// @desc Create a new trade proposal for clan to vote on
router.post('/propose', async (req, res) => {
  try {
    const { clan_id, proposer_id, symbol, action, order_pct } = req.body;

    if (!clan_id || !proposer_id || !symbol || !action || order_pct === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['Buy', 'Sell'].includes(action)) {
      return res.status(400).json({ error: 'Action must be Buy or Sell' });
    }

    if (order_pct < 0 || order_pct > 100) {
      return res.status(400).json({ error: 'Order percentage must be 0-100' });
    }

    // Create proposal with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('trade_proposals')
      .insert([
        {
          clan_id,
          proposer_id,
          symbol: symbol.toUpperCase(),
          action,
          order_pct,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create proposal' });
    }

    // Emit system message to chat
    await supabase
      .from('messages')
      .insert([
        {
          clan_id,
          user_id: proposer_id,
          content: `Trade proposal: ${action} ${order_pct}% in ${symbol.toUpperCase()}`,
          is_ai: true,
          message_type: 'trade_alert'
        }
      ]);

    res.json({ proposal: data[0] });
  } catch (error) {
    console.error('Trade Propose Error:', error);
    res.status(500).json({ error: 'Failed to create trade proposal' });
  }
});

// @route POST /api/trades/vote
// @desc Cast a vote (YES/NO) on a trade proposal
router.post('/vote', async (req, res) => {
  try {
    const { proposal_id, user_id, vote } = req.body;

    if (!proposal_id || !user_id || vote === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof vote !== 'boolean') {
      return res.status(400).json({ error: 'Vote must be true (YES) or false (NO)' });
    }

    // Check if user already voted
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('proposal_id', proposal_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingVote) {
      return res.status(400).json({ error: 'User has already voted on this proposal' });
    }

    // Insert vote
    const { data: voteData, error } = await supabase
      .from('votes')
      .insert([{ proposal_id, user_id, vote }])
      .select();

    if (error) {
      console.error('Supabase vote error:', error);
      return res.status(500).json({ error: 'Failed to record vote', details: error.message });
    }

    // Get proposal details
    const { data: proposal, error: propError } = await supabase
      .from('trade_proposals')
      .select('*')
      .eq('id', proposal_id)
      .maybeSingle();

    if (!proposal || propError) {
      console.error('Proposal fetch error:', propError);
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Count votes
    const { data: allVotes, error: votesError } = await supabase
      .from('votes')
      .select('vote')
      .eq('proposal_id', proposal_id);

    if (votesError) {
      console.error('Votes fetch error:', votesError);
    }

    const yesVotes = (allVotes || []).filter(v => v.vote === true).length;
    const noVotes = (allVotes || []).filter(v => v.vote === false).length;
    const totalVotes = (allVotes || []).length;

    // Get clan member count
    const { data: clanMembers, error: membersError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('clan_id', proposal.clan_id);

    if (membersError) {
      console.error('Members fetch error:', membersError);
    }

    const memberCount = clanMembers?.length || 1;
    const majorityThreshold = Math.floor(memberCount / 2) + 1;
    const passed = yesVotes >= majorityThreshold;

    // Check if vote is complete
    const voteComplete = totalVotes >= memberCount || passed || noVotes >= majorityThreshold;

    if (voteComplete) {
      // Update proposal status
      await supabase
        .from('trade_proposals')
        .update({ status: passed ? 'passed' : 'failed' })
        .eq('id', proposal_id);

      if (passed) {
        // Execute the trade
        let tradeResult = null;
        try {
          tradeResult = await executeTrade(proposal);
        } catch (execError) {
          console.error('Trade execution error:', execError);
        }
        
        // Emit vote result message
        await supabase
          .from('messages')
          .insert([
            {
              clan_id: proposal.clan_id,
              content: `✅ VOTE PASSED (${yesVotes}/${totalVotes})! ${proposal.action}ing ${proposal.order_pct}% in ${proposal.symbol}. Trade executed!`,
              is_ai: true,
              message_type: 'vote_result'
            }
          ]);

        return res.json({ 
          vote: voteData[0], 
          proposalStatus: 'passed',
          voteCount: { yes: yesVotes, no: noVotes, total: totalVotes },
          trade: tradeResult
        });
      } else {
        await supabase
          .from('messages')
          .insert([
            {
              clan_id: proposal.clan_id,
              content: `❌ VOTE FAILED (${yesVotes}/${totalVotes}). Proposal to ${proposal.action} ${proposal.order_pct}% in ${proposal.symbol} did not pass.`,
              is_ai: true,
              message_type: 'vote_result'
            }
          ]);

        return res.json({ 
          vote: voteData[0], 
          proposalStatus: 'failed',
          voteCount: { yes: yesVotes, no: noVotes, total: totalVotes }
        });
      }
    }

    res.json({ 
      vote: voteData[0], 
      voteCount: { yes: yesVotes, no: noVotes, total: totalVotes },
      majorityThreshold,
      proposalStatus: 'voting'
    });
  } catch (error) {
    console.error('Trade Vote Error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Helper function to execute a passed trade proposal
async function executeTrade(proposal) {
  try {
    const { clan_id, symbol, action, order_pct, id: proposal_id } = proposal;

    // Get clan balance
    const { data: clan, error: clanError } = await supabase
      .from('clans')
      .select('balance')
      .eq('id', clan_id)
      .maybeSingle();

    if (!clan || clanError) {
      console.error('Clan fetch error:', clanError);
      throw new Error('Clan not found');
    }

    const tradeAmount = (clan.balance * order_pct) / 100;

    // Mock price - in production, fetch from Finnhub
    const pricePerShare = 100;
    const quantity = tradeAmount / pricePerShare;

    // Insert trade record
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert([
        {
          clan_id,
          user_id: proposal.proposer_id,
          proposal_id: proposal_id,
          symbol: symbol.toUpperCase(),
          action,
          quantity,
          price: pricePerShare
        }
      ])
      .select();

    if (tradeError) {
      console.error('Trade insert error:', tradeError);
      throw tradeError;
    }

    // Update positions or create new position
    if (action === 'Buy') {
      const { data: existingPosition, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('clan_id', clan_id)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle();

      if (existingPosition) {
        // Update existing position (FIFO)
        const newQuantity = parseFloat(existingPosition.quantity) + quantity;
        const newAvgPrice = 
          (parseFloat(existingPosition.avg_price) * parseFloat(existingPosition.quantity) + pricePerShare * quantity) / newQuantity;
        
        await supabase
          .from('positions')
          .update({
            quantity: newQuantity,
            avg_price: newAvgPrice
          })
          .eq('id', existingPosition.id);
      } else {
        // Create new position
        await supabase
          .from('positions')
          .insert([
            {
              clan_id,
              symbol: symbol.toUpperCase(),
              quantity,
              avg_price: pricePerShare
            }
          ]);
      }

      // Deduct from clan balance
      await supabase
        .from('clans')
        .update({ balance: clan.balance - tradeAmount })
        .eq('id', clan_id);
    } else if (action === 'Sell') {
      const { data: position, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('clan_id', clan_id)
        .eq('symbol', symbol.toUpperCase())
        .maybeSingle();

      if (!position || parseFloat(position.quantity) < quantity) {
        throw new Error('Insufficient shares to sell');
      }

      // Update position
      const newQuantity = parseFloat(position.quantity) - quantity;
      if (newQuantity > 0) {
        await supabase
          .from('positions')
          .update({ quantity: newQuantity })
          .eq('id', position.id);
      } else {
        await supabase
          .from('positions')
          .delete()
          .eq('id', position.id);
      }

      // Add to clan balance
      await supabase
        .from('clans')
        .update({ balance: clan.balance + tradeAmount })
        .eq('id', clan_id);
    }

    console.log(`Trade executed: ${action} ${quantity} ${symbol} at $${pricePerShare}`);
    return trade?.[0] || { success: true, quantity, symbol, action, price: pricePerShare };
  } catch (error) {
    console.error('Trade execution error:', error);
    throw error;
  }
}

// @route GET /api/trades/proposals/:clan_id
// @desc Get all active trade proposals for a clan
router.get('/proposals/:clan_id', async (req, res) => {
  try {
    const { clan_id } = req.params;

    const { data, error } = await supabase
      .from('trade_proposals')
      .select('*')
      .eq('clan_id', clan_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ proposals: data || [] });
  } catch (error) {
    console.error('Proposals Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// @route GET /api/trades/positions/:clan_id
// @desc Get current portfolio positions for a clan
router.get('/positions/:clan_id', async (req, res) => {
  try {
    const { clan_id } = req.params;

    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('clan_id', clan_id);

    if (posError) throw posError;

    const { data: clan, error: clanError } = await supabase
      .from('clans')
      .select('balance')
      .eq('id', clan_id)
      .single();

    if (clanError) throw clanError;

    res.json({ 
      cash: clan.balance,
      positions: positions || [],
      totalPositionCount: positions?.length || 0
    });
  } catch (error) {
    console.error('Positions Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

module.exports = router;
