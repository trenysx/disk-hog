import test from "node:test";
import assert from "node:assert/strict";
import { squarify } from "../src/treemap.js";

test("rects cover the full container area", () => {
  const items = [
    { id: "a", value: 50 },
    { id: "b", value: 30 },
    { id: "c", value: 15 },
    { id: "d", value: 5 },
  ];
  const rects = squarify(items, 0, 0, 100, 100);
  const total = rects.reduce((a, r) => a + r.w * r.h, 0);
  assert.ok(Math.abs(total - 10000) < 1e-6, `expected ~10000, got ${total}`);
});

test("each rect stays within bounds", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: i, value: i + 1 }));
  for (const [w, h] of [[200, 100], [10, 300], [1, 1]]) {
    for (const r of squarify(items, 0, 0, w, h)) {
      assert.ok(r.x >= -1e-9 && r.y >= -1e-9, `negative origin for ${w}x${h}`);
      assert.ok(r.x + r.w <= w + 1e-9 && r.y + r.h <= h + 1e-9, `overflow for ${w}x${h}`);
      assert.ok(r.w > 0 && r.h > 0);
    }
  }
});

test("larger values get larger areas", () => {
  const rects = squarify(
    [
      { id: "big", value: 80 },
      { id: "small", value: 20 },
    ],
    0,
    0,
    100,
    100
  );
  const byId = Object.fromEntries(rects.map((r) => [r.id, r]));
  assert.ok(byId.big.w * byId.big.h > byId.small.w * byId.small.h);
});

test("zero-value items are skipped", () => {
  const rects = squarify(
    [
      { id: "a", value: 10 },
      { id: "z", value: 0 },
    ],
    0,
    0,
    50,
    50
  );
  assert.equal(rects.length, 1);
  assert.equal(rects[0].id, "a");
});

test("empty input returns no rects", () => {
  assert.deepEqual(squarify([], 0, 0, 100, 100), []);
});

test("tall narrow containers still produce valid layout", () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ id: i, value: 10 }));
  const rects = squarify(items, 0, 0, 10, 500);
  const total = rects.reduce((a, r) => a + r.w * r.h, 0);
  assert.ok(Math.abs(total - 5000) < 1e-6);
});
