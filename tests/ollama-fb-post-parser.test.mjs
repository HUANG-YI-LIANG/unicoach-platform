import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFbPostWithOllama } from '../lib/ollamaProfileParser.mjs';

test('parseFbPostWithOllama sends the FB post to Ollama generate API and parses JSON output', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        response: JSON.stringify({
          experience: '台大法律系，曾任法科家教',
          philosophy: '用清楚架構陪學生建立信心',
          teaching_features: ['讀書計畫', '考題拆解'],
          location: '台北',
          base_price: 1200,
          service_areas: ['線上', '台北']
        })
      })
    };
  };

  const result = await parseFbPostWithOllama({
    text: '姓名：曾紗弓\n台大法律系，台北，可線上教學，費用 1200/hr',
    baseUrl: 'http://ollama.example.test/',
    model: 'qwen2.5:7b',
    apiKey: 'test-secret',
    fetchImpl
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://ollama.example.test/api/generate');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-secret');
  assert.equal(calls[0].body.model, 'qwen2.5:7b');
  assert.equal(calls[0].body.stream, false);
  assert.equal(calls[0].body.format, 'json');
  assert.match(calls[0].body.prompt, /\/no_think/);
  assert.match(calls[0].body.prompt, /FB 自介文：/);
  assert.match(calls[0].body.prompt, /曾紗弓/);
  assert.equal(calls[0].body.options.temperature, 0.1);

  assert.deepEqual(result, {
    experience: '台大法律系，曾任法科家教',
    philosophy: '用清楚架構陪學生建立信心',
    teaching_features: ['讀書計畫', '考題拆解'],
    location: '台北',
    base_price: 1200,
    service_areas: ['線上', '台北']
  });
});

test('parseFbPostWithOllama returns null price and empty strings/arrays instead of invented fields', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      response: '```json\n{"experience":"只提到陪跑英文","philosophy":"","teaching_features":"耐心","location":null,"base_price":"","service_areas":null}\n```'
    })
  });

  const result = await parseFbPostWithOllama({
    text: '英文陪跑，不確定價格',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1:8b',
    fetchImpl
  });

  assert.deepEqual(result, {
    experience: '只提到陪跑英文',
    philosophy: '',
    teaching_features: ['耐心'],
    location: '',
    base_price: null,
    service_areas: []
  });
});

test('parseFbPostWithOllama reports a clear error when Ollama is unavailable', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 404,
    text: async () => 'model not found'
  });

  await assert.rejects(
    parseFbPostWithOllama({
      text: 'test',
      baseUrl: 'http://localhost:11434',
      model: 'missing-model',
      fetchImpl
    }),
    /Ollama request failed \(404\): model not found/
  );
});
