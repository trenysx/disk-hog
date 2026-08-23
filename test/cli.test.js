import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderHtml, fmtSize } from "../src/report.js";

const CLI = join(import.meta.dirname, "..", "bin", "disk-hog.js");

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "disk-hog-cli-"));
  mkdirSync(join(dir, "data"));
  writeFileSync(join(dir, "data", "x.bin"), Buffer.alloc(1000));
  writeFileSync(join(dir, "y.txt"), Buffer.alloc(10));
  return dir;
}

test("cli writes html report with embedded data", () => {
  const dir = makeFixture();
  try {
    const out = execFileSync(process.execPath, [CLI, dir, "-o", join(dir, "r.html")], { encoding: "utf8" });
    assert.match(out, /Report written/);
    const html = readFileSync(join(dir, "r.html"), "utf8");
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /const DATA =/);
    assert.match(html, /Largest files/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli --json dumps tree", () => {
  const dir = makeFixture();
  try {
    execFileSync(process.execPath, [CLI, dir, "--json", join(dir, "t.json")], { encoding: "utf8" });
    const parsed = JSON.parse(readFileSync(join(dir, "t.json"), "utf8"));
    assert.equal(parsed.tree.size, 1010);
    assert.equal(parsed.tree.fileCount, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("renderHtml is self-contained (no external assets)", () => {
  const tree = { name: "root", size: 100, fileCount: 2, dirCount: 1, children: [
    { name: "d", size: 90, fileCount: 1, dirCount: 0, children: [{ name: "x", size: 90, fileCount: 1, dirCount: 0, children: [] }] },
    { name: "y", size: 10, fileCount: 1, dirCount: 0, children: [] },
  ] };
  const html = renderHtml({ tree, warnings: [], topFiles: [], meta: {} });
  assert.ok(!/<link/i.test(html), "no external stylesheets");
  assert.ok(!/<script[^>]+src=/i.test(html), "no external scripts");
  assert.ok(!/url\(http/i.test(html), "no external assets");
});

test("fmtSize formats human-readable sizes", () => {
  assert.equal(fmtSize(0), "0 B");
  assert.equal(fmtSize(512), "512 B");
  assert.equal(fmtSize(2048), "2.0 KB");
  assert.equal(fmtSize(5 * 1024 * 1024), "5.0 MB");
});

test("cli exits 2 for nonexistent path", () => {
  assert.throws(
    () => execFileSync(process.execPath, [CLI, join(tmpdir(), "nope-nothing")], { stdio: "pipe" }),
    (err) => err.status === 2
  );
});
