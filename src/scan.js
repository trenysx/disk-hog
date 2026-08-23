import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

export async function scan(rootPath, { depth = Infinity, onWarning = null } = {}) {
  const warnings = [];
  const warn = onWarning ?? ((msg) => warnings.push(msg));
  const tree = await scanDir(rootPath, 0, depth, warn);
  return { tree, warnings };
}

async function scanDir(dirPath, level, maxDepth, warn) {
  const node = {
    name: basename(dirPath) || dirPath,
    path: dirPath,
    size: 0,
    fileCount: 0,
    dirCount: 0,
    children: [],
  };
  if (level >= maxDepth) {
    node.truncated = true;
    return node;
  }

  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    warn(`cannot read ${dirPath}: ${err.code ?? err.message}`);
    node.inaccessible = true;
    return node;
  }

  for (const entry of entries) {
    const full = join(dirPath, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const st = statSync(full);
        if (!st.isDirectory()) {
          node.size += st.size;
          node.fileCount++;
          node.children.push({ name: entry.name, path: full, size: st.size, fileCount: 1, dirCount: 0, children: [], symlink: true });
        }
      } catch {
        warn(`broken symlink skipped: ${full}`);
      }
      continue;
    }
    if (entry.isDirectory()) {
      const child = await scanDir(full, level + 1, maxDepth, warn);
      node.size += child.size;
      node.fileCount += child.fileCount;
      node.dirCount += child.dirCount + 1;
      node.children.push(child);
    } else if (entry.isFile()) {
      let size = 0;
      try {
        size = statSync(full).size;
      } catch (err) {
        warn(`cannot stat ${full}: ${err.code ?? err.message}`);
      }
      node.size += size;
      node.fileCount++;
      node.children.push({ name: entry.name, path: full, size, fileCount: 1, dirCount: 0, children: [] });
    }
  }

  node.children.sort((a, b) => b.size - a.size);
  return node;
}

export function largestFiles(node, n = 20, acc = []) {
  for (const child of node.children ?? []) {
    if (!child.dirCount && child.children.length === 0 && !child.truncated) {
      acc.push(child);
    } else {
      largestFiles(child, n, acc);
    }
  }
  acc.sort((a, b) => b.size - a.size);
  if (acc.length > n) acc.length = n;
  return acc;
}
