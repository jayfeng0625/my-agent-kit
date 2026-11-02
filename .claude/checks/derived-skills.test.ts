import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "../..");
const pinningManifest = readFileSync(join(root, "upstream/dark-factory-mode.yaml"), "utf8");
const creditedWithNoUpstreamText = new Set(["ops-mode"]);

const pstackDerived = readdirSync(join(root, "skills")).filter((name) => {
  const license = join(root, "skills", name, "LICENSE");
  return (
    existsSync(license) &&
    /Lauren Tan|cursor\/plugins/.test(readFileSync(license, "utf8")) &&
    !existsSync(join(root, "upstream", `${name}.yaml`)) &&
    !creditedWithNoUpstreamText.has(name)
  );
});

test("pstack-derived skills exist to check", () => {
  assert.ok(pstackDerived.length > 0);
});

for (const name of pstackDerived) {
  test(`dark-factory-mode's merge_guidance routes upstream files to ${name}`, () => {
    assert.ok(pinningManifest.includes(name), `${name} credits pstack but upstream/dark-factory-mode.yaml never names it`);
  });
}
