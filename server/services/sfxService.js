const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://api.elevenlabs.io/v1';
const getApiKey = () => process.env.ELEVENLABS_API_KEY;
const getDefaultVoice = () => process.env.ELEVENLABS_VOICE_ID || 'SOYHLrjzK2X1ezoPC6cr';
let elevenLabsUnavailableUntil = 0;
const ELEVENLABS_RETRY_DELAY_MS = 5 * 60 * 1000;
const shouldTryElevenLabs = () => Boolean(getApiKey()) && Date.now() >= elevenLabsUnavailableUntil;
const markElevenLabsUnavailable = (error) => {
  const isInvalidKey = String(error?.message || '').includes('401');
  elevenLabsUnavailableUntil = isInvalidKey ? Number.POSITIVE_INFINITY : Date.now() + ELEVENLABS_RETRY_DELAY_MS;
};

const ensureElevenLabsKey = () => {
  if (!shouldTryElevenLabs()) {
    throw new Error(getApiKey() ? 'ELEVENLABS_API_KEY is unavailable' : 'ELEVENLABS_API_KEY is missing');
  }
};

const generateFallbackTone = (durationSeconds = 0.35, frequency = 660) => {
  const sampleRate = 22050;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.3 * fade;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + index * 2);
  }

  buffer.contentType = 'audio/wav';
  buffer.provider = 'local';
  return buffer;
};

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
    ensureElevenLabsKey();

    const response = await fetch(`${BASE_URL}/sound-generation`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': getApiKey(),
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
    const buffer = Buffer.from(arrayBuffer);
    buffer.contentType = 'audio/mpeg';
    buffer.provider = 'elevenlabs';
    return buffer;
  } catch (error) {
    console.error('SFX Service Error:', error);
    markElevenLabsUnavailable(error);
    return generateFallbackTone(durationSeconds);
  }
};

const textToSpeech = async (text, voiceId = getDefaultVoice()) => {
  try {
    ensureElevenLabsKey();

    const response = await fetch(`${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0.35,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS API Error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('TTS Service Error:', error.message);
    markElevenLabsUnavailable(error);
    throw error;
  }
};

module.exports = {
  generateSoundEffect,
  textToSpeech,
  getStatus: () => ({
    configured: Boolean(getApiKey()),
    available: shouldTryElevenLabs()
  })
};
