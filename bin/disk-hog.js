#!/usr/bin/env node
import { runCli } from "../src/cli.js";

runCli(process.argv.slice(2)).catch((err) => {
  console.error(`disk-hog: ${err.message}`);
  process.exit(1);
});
