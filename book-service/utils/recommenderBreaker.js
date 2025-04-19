// utils/recommenderBreaker.js
const axios = require("axios");
const CircuitBreaker = require("opossum");

const RECOMMENDER_BASE_URL = process.env.RECOMMENDER_BASE_URL; // e.g. http://18.118.230.221

// ────────────────────────────────────────────────────────────
// Production endpoint:  GET /recommendations/{ISBN}
// Returns: { related: [ { ISBN, title, Author }, … ] }
// ────────────────────────────────────────────────────────────
async function fetchRelated(isbn) {
  const url = `${RECOMMENDER_BASE_URL}/recommendations/${isbn}`;
  const { data } = await axios.get(url, { timeout: 3000 });
  return data; // { related: [...] }
}

const breakerOptions = {
  timeout: 3000, // fail if no response in 3 s
  errorThresholdPercentage: 1, // open after first failure
  resetTimeout: 60000, // half‑open after 60 s
};

const breaker = new CircuitBreaker(fetchRelated, breakerOptions);

// When breaker is OPEN, fall back to empty list
breaker.fallback(() => ({ related: [] }));

module.exports = breaker;
