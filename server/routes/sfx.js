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
  const { text, durationSeconds, promptInfluence } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';
  
  if (!cleanText) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }
  if (cleanText.length > 600) {
    return res.status(400).json({ error: 'Text prompt must be 600 characters or fewer' });
  }

  const duration = Number(durationSeconds ?? 2);
  const influence = Number(promptInfluence ?? 0.3);
  if (!Number.isFinite(duration) || duration < 0.5 || duration > 22) {
    return res.status(400).json({ error: 'Duration must be between 0.5 and 22 seconds' });
  }
  if (!Number.isFinite(influence) || influence < 0 || influence > 1) {
    return res.status(400).json({ error: 'Prompt influence must be between 0 and 1' });
  }

  try {
    const audioBuffer = await sfxService.generateSoundEffect(
      cleanText,
      duration,
      influence
    );
    
    res.set({
      'Content-Type': audioBuffer.contentType || 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'X-Audio-Provider': audioBuffer.provider || 'elevenlabs'
    });
    res.send(audioBuffer);
  } catch (error) {
    sendSfxError(res, error, 'Failed to generate sound effect');
  }
});

// @route POST /api/sfx/tts
// @desc Generate Alpha Meow speech with ElevenLabs
router.post('/tts', async (req, res) => {
  const { text, voiceId } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';

  if (!cleanText) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const audioBuffer = await sfxService.textToSpeech(cleanText.slice(0, 600), voiceId);

    res.set({
      'Content-Type': audioBuffer.contentType || 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'X-Audio-Provider': audioBuffer.provider || 'elevenlabs'
    });
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message.includes('ELEVENLABS_API_KEY') ? 'ELEVENLABS_API_KEY is missing' : 'Failed to generate speech' });
  }
});

// @route POST /api/sfx/trade
// @desc Generate a cash register or coin sound effect for trades
router.post('/trade', async (req, res) => {
  try {
    const prompt = "A satisfying cash register cha-ching sound effect";
    const audioBuffer = await sfxService.generateSoundEffect(prompt);
    
    res.set({
      'Content-Type': audioBuffer.contentType || 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'X-Audio-Provider': audioBuffer.provider || 'elevenlabs'
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
      'Content-Type': audioBuffer.contentType || 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'X-Audio-Provider': audioBuffer.provider || 'elevenlabs'
    });
    res.send(audioBuffer);
  } catch (error) {
    sendSfxError(res, error, 'Failed to generate meow sound effect');
  }
});

module.exports = router;
