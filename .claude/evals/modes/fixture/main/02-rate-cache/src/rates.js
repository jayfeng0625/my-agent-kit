import { LruCache } from "./cache.js";
import { loadConfig } from "./config.js";

const TABLE = { CA: 0.0725, NY: 0.04, TX: 0.0625, OR: 0, WA: 0.065 };

const config = loadConfig();
const cache = new LruCache(config.rateCacheSize ?? 16);
let lookups = 0;

function fetchRate(region) {
  if (!(region in TABLE)) throw new Error(`unknown region: ${region}`);
  lookups += 1;
  return TABLE[region];
}

export function rateFor(region) {
  const cached = cache.get(region);
  if (cached !== undefined) return cached;
  const rate = fetchRate(region);
  cache.set(region, rate);
  return rate;
}

// Called when the pricing team publishes a new rate.
export function setRate(region, rate) {
  TABLE[region] = rate;
  cache.set(region, rate);
}

export function lookupCount() {
  return lookups;
}
