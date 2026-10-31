import assert from "node:assert/strict";
import { test } from "node:test";
import { LruCache } from "../src/cache.js";

test("get returns what set stored", () => {
  const cache = new LruCache(2);
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("missing"), undefined);
});

test("adding past capacity evicts the least recently used key", () => {
  const cache = new LruCache(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("c"), 3);
});
