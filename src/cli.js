import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { scan, largestFiles } from "./scan.js";
import { renderHtml } from "./report.js";

const USAGE = `disk-hog — zero-dependency disk usage treemap

Usage:
  disk-hog <path> [options]

Options:
  -o, --output <file>   Write HTML report to file (default: disk-hog-report.html)
  --json <file>         Also dump the scanned tree as JSON
  -L, --depth <n>       Limit scan depth (default: unlimited)
  --stdout              Print HTML to stdout instead of writing a file
  -h, --help            Show this help
  -v, --version         Show version`;

function parseArgs(argv) {
  const args = { positional: [], output: null, json: null, depth: Infinity, stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        if (!args.output) throw new Error(`${a} requires a value`);
        break;
      case "--json":
        args.json = argv[++i];
        if (!args.json) throw new Error(`${a} requires a value`);
        break;
      case "-L":
      case "--depth": {
        const n = Number(argv[++i]);
        if (!Number.isInteger(n) || n < 1) throw new Error("--depth expects a positive integer");
        args.depth = n;
        break;
      }
      case "--stdout":
        args.stdout = true;
        break;
      default:
        if (a.startsWith("-") && a.length > 1 && Number.isNaN(Number(a))) {
          throw new Error(`unknown option: ${a}\n\n${USAGE}`);
        }
        args.positional.push(a);
    }
  }
  return args;
}

export async function runCli(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (args.version) {
    console.log("disk-hog v0.1.0");
    return;
  }
  if (args.help || args.positional.length === 0) {
    console.log(USAGE);
    if (!args.help) process.exit(2);
    return;
  }

  const root = resolve(args.positional[0]);
  try {
    if (!statSync(root).isDirectory()) {
      console.error(`disk-hog: not a directory: ${root}`);
      process.exit(2);
    }
  } catch {
    console.error(`disk-hog: cannot access path: ${root}`);
    process.exit(2);
  }

  const started = Date.now();
  const { tree, warnings } = await scan(root, { depth: args.depth });
  const topFiles = largestFiles(tree, 25);

  for (const w of warnings.slice(0, 5)) console.warn(`warn: ${w}`);
  if (warnings.length > 5) console.warn(`warn: ...and ${warnings.length - 5} more`);

  if (args.json) {
    writeFileSync(args.json, JSON.stringify({ tree, warnings }, null, 2));
  }

  const html = renderHtml({
    tree,
    warnings,
    topFiles,
    meta: { root, scannedAt: new Date().toISOString(), durationMs: Date.now() - started },
  });

  if (args.stdout) {
    process.stdout.write(html);
    return;
  }

  const outPath = args.output ?? "disk-hog-report.html";
  writeFileSync(outPath, html);
  console.log(
    `Scanned ${basename(root)}: ${tree.fileCount.toLocaleString()} files, ${tree.dirCount.toLocaleString()} folders`
  );
  console.log(`Report written to ${outPath}`);
}
