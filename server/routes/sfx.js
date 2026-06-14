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
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  try {
    const audioBuffer = await sfxService.generateSoundEffect(text);
    
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
    const prompt = "A satisfying cash register cha-ching sound effect";
    const audioBuffer = await sfxService.generateSoundEffect(prompt);
    
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
    const prompt = "Alpha Meow here! Let's get this bread!";
    const audioBuffer = await sfxService.generateSoundEffect(prompt);
    
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
