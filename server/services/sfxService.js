const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

const generateSoundEffect = async (text, durationSeconds = 2.0, promptInfluence = 0.3) => {
  try {
    const response = await fetch(`${BASE_URL}/sound-generation`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs SFX API Error: ${response.status}`);
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
  generateSoundEffect
};
