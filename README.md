# disk-hog

**Zero-dependency disk usage analyzer.** Run one command on any directory and get a beautiful, self-contained, interactive HTML treemap showing exactly what's eating your space.

No install, no native modules, no Python, no Electron. Your data never leaves your machine.

```bash
npx disk-hog /path/to/dir
# -> disk-hog-report.html
```

## The problem

"What's taking up all my disk space?" usually means installing WinDirStat (Windows), WizTree (Windows only), or running `du -h` and squinting at text. All are either platform-specific, closed-source, or non-interactive. A one-shot `npx` command that produces an interactive, shareable HTML report is a better answer.

## What you get

- **Interactive treemap** — Click any folder to zoom in, breadcrumbs to zoom out. Files are leaf rectangles.
- **Color-coded by size** — Instantly spot the biggest consumers.
- **Top 25 largest files** table with relative-size bars.
- **Self-contained HTML** — Inline CSS + JS + embedded data. No external assets, works offline, emailable.
- **JSON export** — `--json tree.json` for pipelines.
- **Depth limiting** — `-L 2` to skim large trees fast.
- **Permission warnings** — Reports inaccessible directories without crashing.

## Install

Nothing to install with npx:

```bash
npx disk-hog /path/to/dir
```

Or add to a project:

```bash
npm install --save-dev disk-hog
```

Requires Node.js ≥ 18.

## Usage

```
disk-hog <path> [options]

Options:
  -o, --output <file>   Write HTML report to file (default: disk-hog-report.html)
  --json <file>         Also dump the scanned tree as JSON
  -L, --depth <n>       Limit scan depth (default: unlimited)
  --stdout              Print HTML to stdout instead of writing a file
  -h, --help            Show this help
  -v, --version         Show version
```

### Examples

Scan and open the report:

```bash
disk-hog ~/Downloads
open disk-hog-report.html   # macOS
start disk-hog-report.html  # Windows
```

Limit depth for a quick overview:

```bash
disk-hog /var/log -L 2
```

Feed the tree into another tool:

```bash
disk-hog /data --json tree.json -o /dev/null   # Unix
disk-hog /data --json tree.json --stdout > NUL # Windows
```

## How it compares

| | disk-hog | WinDirStat | WizTree | `du` / `ncdu` |
|---|---|---|---|---|
| Cross-platform | ✅ Node.js | Windows | Windows | Unix |
| No install | ✅ `npx` | Installer | Installer | ✅ |
| Interactive treemap | ✅ | ✅ | ✅ | ❌ |
| Self-contained report | ✅ | ❌ | ❌ | ❌ |
| JSON export | ✅ | ❌ | ❌ | ✅ |

## Programmatic API

```js
import { scan, renderHtml, largestFiles } from "disk-hog";

const { tree, warnings } = await scan("/path/to/dir", { depth: 3 });
const topFiles = largestFiles(tree, 10);
const html = renderHtml({ tree, warnings, topFiles, meta: {} });
```

## Limitations

- Scans synchronously; very large trees may take a few seconds.
- Loads full tree in memory before rendering (streaming treemap is on the roadmap).
- Follows symlinks to files but not into symlinked directories (avoids loops).

## Contributing

Issues and PRs welcome. Run tests with:

```bash
npm test
```

## License

[Apache-2.0](LICENSE) © trenysx