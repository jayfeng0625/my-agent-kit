// Prints the tax-rate cache capacity the service builds under NODE_ENV, whichever key sets it.
const { LruCache } = await import(`${process.env.TREE}/src/cache.js`);
const set = LruCache.prototype.set;
let max;
LruCache.prototype.set = function (key, value) {
  max = this.max;
  return set.call(this, key, value);
};
const { rateFor } = await import(`${process.env.TREE}/src/rates.js`);
rateFor("CA");
console.log(max);
