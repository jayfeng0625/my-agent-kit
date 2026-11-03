// Secondary: a set counts as a use, as in any LRU.
import assert from "node:assert/strict";
import { test } from "node:test";

const { LruCache } = await import(`${process.env.TREE}/src/cache.js`);

test("updating a key makes it the most recently used", () => {
  const cache = new LruCache(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("a", 10);
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), 10);
});
