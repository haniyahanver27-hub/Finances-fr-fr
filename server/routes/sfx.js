const express = require('express');
const router = express.Router();
const sfxService = require('../services/sfxService');
const { ttsLimiter } = require('../middleware/rateLimiter');

const sendSfxError = (res, error, fallbackMessage) => {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const errorMessage = error?.expose ? error.message : fallbackMessage;

  console.error('SFX Route Error:', error);

  return res.status(statusCode).json({
    error: errorMessage,
    code: error?.code || 'SFX_ROUTE_ERROR'
  });
};

// We still use ttsLimiter since it limits audio generation
router.use(ttsLimiter);

// @route POST /api/sfx/generate
// @desc Generate an arbitrary sound effect
router.post('/generate', async (req, res) => {
  const { text, durationSeconds, promptInfluence } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  try {
    const audioBuffer = await sfxService.generateSoundEffect(
      text, 
      durationSeconds || 2.0, 
      promptInfluence || 0.3
    );
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    sendSfxError(res, error, 'Failed to generate sound effect');
  }
});

// @route POST /api/sfx/trade
// @desc Generate a cash register or coin sound effect for trades
router.post('/trade', async (req, res) => {
  try {
    const prompt = "A loud, satisfying vintage cash register cha-ching sound indicating a successful transaction";
    const audioBuffer = await sfxService.generateSoundEffect(prompt, 1.5, 0.4);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    sendSfxError(res, error, 'Failed to generate trade sound effect');
  }
});

// @route POST /api/sfx/meow
// @desc Generate an Alpha Meow cat sound
router.post('/meow', async (req, res) => {
  try {
    const prompt = "An aggressive, slightly chaotic but cute cat meow";
    const audioBuffer = await sfxService.generateSoundEffect(prompt, 1.0, 0.3);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    sendSfxError(res, error, 'Failed to generate meow sound effect');
  }
});

module.exports = router;
