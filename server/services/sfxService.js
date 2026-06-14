const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://api.elevenlabs.io/v1';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Default ElevenLabs voice (Rachel)

class SfxServiceError extends Error {
  constructor(message, { statusCode = 500, code = 'SFX_SERVICE_ERROR', expose = false, cause } = {}) {
    super(message);
    this.name = 'SfxServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
    if (cause) this.cause = cause;
  }
}

const getElevenLabsApiKey = () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'sk_' || apiKey.startsWith('sk_') === false) {
    throw new SfxServiceError(
      'ELEVENLABS_API_KEY is missing or invalid. Add it to server/.env and restart the backend.',
      { statusCode: 503, code: 'ELEVENLABS_API_KEY_MISSING', expose: true }
    );
  }
  return apiKey;
};

// Use TTS endpoint (text-to-speech), not sound-generation
const generateSoundEffect = async (text, voiceId = VOICE_ID) => {
  try {
    const apiKey = getElevenLabsApiKey();
    
    const url = `${BASE_URL}/text-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text || 'Alpha Meow is here',
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs Error (${response.status}):`, errorText);
      throw new SfxServiceError(`ElevenLabs API Error: ${response.status}`, {
        statusCode: response.status === 401 ? 503 : 502,
        code: response.status === 401 ? 'ELEVENLABS_API_KEY_INVALID' : 'ELEVENLABS_UPSTREAM_ERROR',
        expose: true
      });
    }

    // Return the audio buffer directly
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('SFX Service Error:', error);
    throw error;
  }
};

module.exports = {
  generateSoundEffect,
  SfxServiceError
};
