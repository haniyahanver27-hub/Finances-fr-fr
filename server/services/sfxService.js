const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://api.elevenlabs.io/v1';

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
  if (!apiKey) {
    throw new SfxServiceError(
      'ELEVENLABS_API_KEY is missing. Add it to server/.env and restart the backend.',
      { statusCode: 503, code: 'ELEVENLABS_API_KEY_MISSING', expose: true }
    );
  }
  return apiKey;
};

const generateSoundEffect = async (text, durationSeconds = 2.0, promptInfluence = 0.3) => {
  try {
    const apiKey = getElevenLabsApiKey();
    const response = await fetch(`${BASE_URL}/sound-generation`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence
      }),
    });

    if (!response.ok) {
      throw new SfxServiceError(`ElevenLabs SFX API Error: ${response.status}`, {
        statusCode: response.status === 401 ? 503 : 502,
        code: response.status === 401 ? 'ELEVENLABS_API_KEY_INVALID' : 'ELEVENLABS_UPSTREAM_ERROR',
        expose: response.status === 401
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
