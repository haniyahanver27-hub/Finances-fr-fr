const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IncomingMessage, ServerResponse } = require('node:http');
const { Duplex } = require('node:stream');
const app = require('../index');
const aiService = require('../services/aiService');

const request = ({ method = 'GET', path, headers = {}, body = '' }) => new Promise((resolve, reject) => {
  const output = [];
  const socket = new Duplex({
    read() {},
    write(chunk, encoding, callback) {
      output.push(Buffer.from(chunk));
      callback();
    }
  });
  Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
  const req = new IncomingMessage(socket);
  req.method = method;
  req.url = path;
  req.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  if (body) req.headers['content-length'] = String(Buffer.byteLength(body));

  const res = new ServerResponse(req);
  res.assignSocket(socket);
  res.on('finish', () => {
    const raw = Buffer.concat(output).toString('utf8');
    const splitAt = raw.indexOf('\r\n\r\n');
    const head = raw.slice(0, splitAt);
    const responseBody = raw.slice(splitAt + 4);
    const status = Number(head.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);

    resolve({
      status,
      json: () => JSON.parse(responseBody)
    });
  });
  res.on('error', reject);

  app(req, res);
  if (body) req.push(body);
  req.push(null);
});

test('health endpoint reports the API is running', async () => {
  const response = await request({ path: '/health' });
  const body = response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('status endpoint reports Alpha Meow provider', async () => {
  const response = await request({ path: '/api/status' });
  const body = response.json();

  assert.equal(response.status, 200);
  assert.ok(['openai', 'local'].includes(body.services.alphaMeow));
});

test('stock routes reject invalid symbols before calling Finnhub', async () => {
  const response = await request({ path: '/api/stocks/quote/%20' });
  const body = response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'INVALID_SYMBOL');
});

test('candle route validates its date range', async () => {
  const response = await request({ path: '/api/stocks/candles/NVDA?from=20&to=10' });
  const body = response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, 'INVALID_DATE_RANGE');
});

test('AI chat requires a message', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/ai/chat'
  });

  assert.equal(response.status, 400);
});

test('Alpha Meow answers vague questions without a generic dead end', () => {
  const reply = aiService.localCoachReply('what');

  assert.match(reply, /Name a stock/);
  assert.doesNotMatch(reply, /define the goal, inspect the stats/);
});

test('Alpha Meow uses conversation context for vague follow-ups', () => {
  const reply = aiService.localCoachReply('why', [
    { role: 'user', content: 'Should I buy NVDA?' }
  ]);

  assert.match(reply, /Should I buy NVDA/);
});

test('Alpha Meow identifies a ticker instead of the pronoun I', () => {
  const reply = aiService.localCoachReply('Should I buy NVDA?');

  assert.match(reply, /^NVDA needs/);
});

test('sound generation requires a prompt before calling ElevenLabs', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/sfx/generate'
  });

  assert.equal(response.status, 400);
});

test('stock search requires a query before calling Finnhub', async () => {
  const response = await request({ path: '/api/stocks/search' });
  const body = response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Search query is required');
});
