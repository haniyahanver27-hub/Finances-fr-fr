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
diff --git a//Users/haniyahanversathic/Finances-fr-fr/server/services/aiService.js b//Users/haniyahanversathic/Finances-fr-fr/server/services/aiService.js
--- a//Users/haniyahanversathic/Finances-fr-fr/server/services/aiService.js
+++ b//Users/haniyahanversathic/Finances-fr-fr/server/services/aiService.js
@@ -1,4 +1,12 @@
 const { OpenAI } = require('openai');
+const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
 
+const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
+const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
+
 const getOpenAIClient = () => {
+  if (!process.env.OPENAI_API_KEY) {
+    throw new Error('OPENAI_API_KEY is missing');
+  }
+
   return new OpenAI({
@@ -8,2 +16,4 @@
 
+const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
+
 const ALPHA_MEOW_PROMPT = `You are Alpha Meow, a chaotic, cat-bro financial mentor.
@@ -33,3 +43,3 @@
     const response = await openai.chat.completions.create({
-      model: 'gpt-4o-mini',
+      model: OPENAI_MODEL,
       messages,
@@ -39,6 +49,9 @@
 
-    return response.choices[0].message.content;
+    return response.choices?.[0]?.message?.content || "My answer got nerfed mid-cast. Ask again with fewer words.";
   } catch (error) {
-    console.error('OpenAI Error:', error);
-    return "Bruh, my servers are lagging. Give me a sec to respawn.";
+    console.error('OpenAI Error:', error.message);
+    if (error.message.includes('OPENAI_API_KEY')) {
+      return "Alpha Meow needs OPENAI_API_KEY in server/.env before I can answer live.";
+    }
+    return "Bruh, my OpenAI lane is lagging. Check the server console, then make me respawn.";
   }
@@ -53,3 +66,3 @@
     const response = await openai.chat.completions.create({
-      model: 'gpt-4o-mini',
+      model: OPENAI_MODEL,
       messages: [
@@ -62,5 +75,5 @@
 
-    return response.choices[0].message.content;
+    return response.choices?.[0]?.message?.content || "That term dodged my scanner. Try another one.";
   } catch (error) {
-    console.error('OpenAI Error:', error);
+    console.error('OpenAI Error:', error.message);
     return "Error 404: Knowledge not found in my databanks right now.";
@@ -78,3 +91,3 @@
     const response = await openai.chat.completions.create({
-      model: 'gpt-4o-mini',
+      model: OPENAI_MODEL,
       messages: [
@@ -87,5 +100,5 @@
 

    return response.choices?.[0]?.message?.content || `TRADE LOCKED: ${action} ${symbol}. Manage risk like it is ranked mode.`;
   } catch (error) {

    console.error('OpenAI Error:', error.message);
     return `TRADE SECURED: ${tradeData.action} ${tradeData.symbol}. Let's get this loot!`;

 
const fallbackQuiz = (topic = 'diversification') => ({
  provider: 'local',
  title: 'Alpha Meow Warmup',
  questions: [
    {
      question: `In Alpha Meow terms, what is ${topic}?`,
      options: [
        'Spreading your loot so one bad drop does not wipe the squad',
        'Putting every coin into one hype stock',
        'Borrowing max margin for a speedrun',
        'Ignoring risk because vibes are green'
      ],
      answerIndex: 0,
      explanation: 'Correct. Diversification keeps one nerfed pick from deleting the whole inventory.'
    },
    {
      question: 'What does position size control?',
      options: [
        'How much damage one bad trade can do',
        'The color of a stock chart',
        'How famous a company is',
        'The number of clan votes'
      ],
      answerIndex: 0,
      explanation: 'Yep. Position sizing is your HP bar management.'
    },
          question: 'Why should a clan vote before a big trade?',
           options: [
        'To slow down panic clicks and catch weak logic',
        'To guarantee profit',
        'To remove market risk',
        'To make prices update faster'
      ],
      answerIndex: 0,
      explanation: 'Exactly. Votes are squad comms before the boss fight.'
    }
  ]
});

const normalizeQuiz = (raw, topic) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return {
    provider: 'gemini',
    title: parsed.title || `Alpha Meow ${topic} Quiz`,
    questions: questions.slice(0, 5).map((item) => ({
      question: String(item.question || '').slice(0, 180),
      options: Array.isArray(item.options) ? item.options.slice(0, 4).map((option) => String(option).slice(0, 120)) : [],
      answerIndex: Number.isInteger(item.answerIndex) ? item.answerIndex : 0,
      explanation: String(item.explanation || '').slice(0, 220)
    })).filter((item) => item.question && item.options.length === 4)
  };
};

const generateQuiz = async ({ topic = 'diversification', difficulty = 'starter' } = {}) => {
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    return fallbackQuiz(topic);
  }

  const prompt = `Create a 3-question finance quiz for Project Alpha.
Topic: ${topic}
Difficulty: ${difficulty}
Mascot: Alpha Meow, a hype game-style finance coach.
Return only valid JSON with this shape:
{"title":"string","questions":[{"question":"string","options":["A","B","C","D"],"answerIndex":0,"explanation":"string"}]}
Explanations must be under 24 words and use a game analogy.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,+          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const quiz = normalizeQuiz(text, topic);
    return quiz.questions.length ? quiz : fallbackQuiz(topic);
  } catch (error) {
    console.error('Gemini Error:', error.message);
    return fallbackQuiz(topic);
  }
};

 module.exports = {
   translateJargon,
 generateTradeAlert,
 generateQuiz
 };
