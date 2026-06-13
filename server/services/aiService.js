const { OpenAI } = require('openai');

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const ALPHA_MEOW_PROMPT = `You are Alpha Meow, a chaotic, cat-bro financial mentor.
You speak in gaming slang, internet culture, and hype.
You refer to yourself as Alpha Meow.
Your goal is to explain finance to Gen-Z in the most hype, understandable way possible.
RULES:
1. MAX 25 WORDS PER EXPLANATION. If you go over, you fail.
2. Use gaming analogies (HP, loot drops, min-maxing, nerfed, buffed, etc.).
3. Stay in character 100% of the time. You are slightly aggressive but want them to succeed.
4. No boring financial jargon. If you must use a term, instantly relate it to gaming.`;

const chat = async (userMessage, context = []) => {
  try {
    const openai = getOpenAIClient();
    
    // Format context for OpenAI
    const messages = [
      { role: 'system', content: ALPHA_MEOW_PROMPT },
      ...context.map(msg => ({
        role: msg.is_ai ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 100,
      temperature: 0.9,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error);
    return "Bruh, my servers are lagging. Give me a sec to respawn.";
  }
};

const translateJargon = async (term) => {
  try {
    const openai = getOpenAIClient();
    const prompt = `Translate the financial term "${term}" into gaming slang. 
    MAX 25 WORDS. Use a gaming analogy. Do not use the word itself in the definition.`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ALPHA_MEOW_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.8,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error);
    return "Error 404: Knowledge not found in my databanks right now.";
  }
};

const generateTradeAlert = async (tradeData) => {
  try {
    const openai = getOpenAIClient();
    const { action, symbol, quantity, price } = tradeData;
    
    const prompt = `React to a clan executing a trade: ${action}ing ${quantity} shares of ${symbol} at $${price}. 
    Hype them up if it's a good move, or call it risky. MAX 25 WORDS. Gaming slang only.`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ALPHA_MEOW_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.9,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error);
    return `TRADE SECURED: ${tradeData.action} ${tradeData.symbol}. Let's get this loot!`;
  }
};

module.exports = {
  chat,
  translateJargon,
  generateTradeAlert
};
