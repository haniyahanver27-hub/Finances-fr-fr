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
  const { message, context } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await aiService.chat(message, context || []);
    res.json({ reply: response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to communicate with AI' });
  }
});

// @route POST /api/ai/jargon
router.post('/jargon', async (req, res) => {
  const { term } = req.body;
  if (!term) {
    return res.status(400).json({ error: 'Term is required' });
  }

  // First check static dictionary to save API costs
  const localMatch = keywordDict.find(k => k.term.toLowerCase() === term.toLowerCase());
  
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
    const response = await aiService.translateJargon(term);
    res.json({ term, analogy: response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to translate jargon' });
  }
});

module.exports = router;
