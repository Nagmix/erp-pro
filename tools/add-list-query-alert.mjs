import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'src', 'app', '(dashboard)');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

const importLine = `import { ListQueryAlert } from '@/components/erp/list-query-alert';`;
const alertJsx = `      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />\n`;

for (const file of walk(root)) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('ListQueryAlert') || !s.includes('isError, error, refetch')) continue;
  if (!s.includes("useDocList")) continue;

  if (!s.includes(importLine)) {
    const hookImport = "from '@/lib/client/hooks'";
    const idx = s.indexOf(hookImport);
    if (idx === -1) continue;
    const lineEnd = s.indexOf('\n', idx);
    s = s.slice(0, lineEnd + 1) + importLine + '\n' + s.slice(lineEnd + 1);
  }

  const marker = '<div className="space-y-6">';
  const pos = s.indexOf(marker);
  if (pos === -1) continue;
  const insertAt = pos + marker.length;
  if (s.slice(insertAt, insertAt + 80).includes('ListQueryAlert')) continue;
  s = s.slice(0, insertAt) + '\n' + alertJsx + s.slice(insertAt);

  fs.writeFileSync(file, s);
  console.log('patched', file);
}
