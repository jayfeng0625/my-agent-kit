// Updating a cached key must not evict another key.
import assert from "node:assert/strict";
import { test } from "node:test";

const { LruCache } = await import(`${process.env.TREE}/src/cache.js`);

test("updating a key in a full cache keeps the other keys", () => {
  const cache = new LruCache(2);
  cache.set("CA", 0.0725);
  cache.set("NY", 0.04);
  cache.set("NY", 0.045);
  assert.equal(cache.get("CA"), 0.0725);
  assert.equal(cache.get("NY"), 0.045);
  assert.equal(cache.size, 2);
});

test("new keys past capacity still evict the least recently used", () => {
  const cache = new LruCache(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), 1);
});
