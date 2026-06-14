const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { aiLimiter } = require('../middleware/rateLimiter');
const fs = require('fs');
const path = require('path');

// Load static keyword dictionary
const keywordsPath = path.join(__dirname, '../data/financialKeywords.json');
let keywordDict = [];
try {
  keywordDict = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
} catch (e) {
  console.error("Error loading financial keywords:", e);
}

router.use(aiLimiter);

// @route POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, context } = req.body || {};
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (cleanMessage.length > 1200) {
    return res.status(400).json({ error: 'Message must be 1200 characters or fewer' });
  }

  try {
    const response = await aiService.chat(cleanMessage, Array.isArray(context) ? context.slice(-8) : []);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to communicate with AI' });
  }
});

// @route POST /api/ai/quiz
router.post('/quiz', async (req, res) => {
  const { topic, difficulty } = req.body || {};
  const cleanTopic = typeof topic === 'string' && topic.trim() ? topic.trim() : 'diversification';
  const cleanDifficulty = typeof difficulty === 'string' ? difficulty.trim().toLowerCase() : 'starter';

  if (cleanTopic.length > 80) {
    return res.status(400).json({ error: 'Quiz topic must be 80 characters or fewer' });
  }
  if (!['starter', 'intermediate', 'challenge'].includes(cleanDifficulty)) {
    return res.status(400).json({ error: 'Invalid quiz difficulty' });
  }

  try {
    const quiz = await aiService.generateQuiz({ topic: cleanTopic, difficulty: cleanDifficulty });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// @route POST /api/ai/jargon
router.post('/jargon', async (req, res) => {
  const { term } = req.body || {};
  const cleanTerm = typeof term === 'string' ? term.trim() : '';
  if (!cleanTerm) {
    return res.status(400).json({ error: 'Term is required' });
  }
  if (cleanTerm.length > 80) {
    return res.status(400).json({ error: 'Term must be 80 characters or fewer' });
  }

  // First check static dictionary to save API costs
  const localMatch = keywordDict.find(k => k.term.toLowerCase() === cleanTerm.toLowerCase());
  
  try {
    if (localMatch) {
      // Still use AI to make it sound like Alpha Meow contextually, or just return static
      // To strictly adhere to API cost mitigation, we return the static analogy if found
      return res.json({ 
        term: localMatch.term,
        definition: localMatch.definition,
        analogy: localMatch.gaming_analogy 
      });
    }

    // Fallback to AI if term not in static dictionary
    const response = await aiService.translateJargon(cleanTerm);
    res.json({ term: cleanTerm, analogy: response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to translate jargon' });
  }
});

module.exports = router;
