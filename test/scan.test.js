import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scan, largestFiles } from "../src/scan.js";

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "disk-hog-test-"));
  mkdirSync(join(dir, "big"));
  mkdirSync(join(dir, "small", "nested"), { recursive: true });
  writeFileSync(join(dir, "big", "a.bin"), Buffer.alloc(3000));
  writeFileSync(join(dir, "big", "b.bin"), Buffer.alloc(2000));
  writeFileSync(join(dir, "small", "c.txt"), Buffer.alloc(100));
  writeFileSync(join(dir, "small", "nested", "d.txt"), Buffer.alloc(50));
  return dir;
}

test("scan aggregates sizes and counts correctly", async () => {
  const dir = makeFixture();
  try {
    const { tree } = await scan(dir);
    assert.equal(tree.size, 5150);
    assert.equal(tree.fileCount, 4);
    assert.equal(tree.dirCount, 3);
    const big = tree.children.find((c) => c.name === "big");
    assert.equal(big.size, 5000);
    assert.equal(big.fileCount, 2);
    const small = tree.children.find((c) => c.name === "small");
    assert.equal(small.size, 150);
    assert.ok(!small.children.find((c) => c.name === "nested").truncated);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("children sorted by size descending", async () => {
  const dir = makeFixture();
  try {
    const { tree } = await scan(dir);
    for (let i = 1; i < tree.children.length; i++) {
      assert.ok(tree.children[i - 1].size >= tree.children[i].size);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("depth limit marks deeper dirs truncated without reading them", async () => {
  const dir = makeFixture();
  try {
    const { tree } = await scan(dir, { depth: 1 });
    const small = tree.children.find((c) => c.name === "small");
    assert.ok(small.truncated);
    assert.equal(small.size, 0);
    assert.equal(small.children.length, 0);
    assert.equal(tree.fileCount, 0, "no files below the depth limit are read");
    assert.equal(tree.size, 0, "sizes below the limit are not measured");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("largestFiles returns files only, sorted desc, capped at n", async () => {
  const dir = makeFixture();
  try {
    const { tree } = await scan(dir);
    const top = largestFiles(tree, 2);
    assert.equal(top.length, 2);
    assert.equal(top[0].name, "a.bin");
    assert.equal(top[0].size, 3000);
    assert.equal(top[1].name, "b.bin");
    assert.ok(top.every((f) => !f.dirCount));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
