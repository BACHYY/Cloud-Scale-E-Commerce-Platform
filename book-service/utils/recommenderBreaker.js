// utils/recommenderBreaker.js
const axios = require("axios");
const CircuitBreaker = require("opossum");

const RECOMMENDER_BASE_URL =
  process.env.RECOMMENDER_BASE_URL || "http://recommender-svc";

async function fetchRelated(isbn) {
  const url = `${RECOMMENDER_BASE_URL}/api/v1/related?isbn=${isbn}`;
  const { data } = await axios.get(url, { timeout: 3000 });
  return data; // expect: { related: [ "978123...", ... ] }
}

const breakerOptions = {
  timeout: 3000, // give the remote 3 s before failing
  errorThresholdPercentage: 1,
  resetTimeout: 60000, // try again after 15 s
};

const breaker = new CircuitBreaker(fetchRelated, breakerOptions);

// graceful fallback when breaker is OPEN
breaker.fallback(() => ({ related: [] }));

module.exports = breaker;
