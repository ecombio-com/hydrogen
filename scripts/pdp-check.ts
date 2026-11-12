// Path: scripts/pdp-check.ts
// Validate custom.specs / custom.faq JSON files against app/lib/pdp-schema.ts.
// Usage: pnpm dlx tsx scripts/pdp-check.ts <file.specs.json> [<file.faq.json> ...]
// A file ending in .specs.json is checked as specs; .faq.json as FAQ. Exit code 1 on any failure.
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {z} from 'zod';
import {SpecsSchema, FaqSchema} from '../app/lib/pdp-schema';

const LIMIT = 128 * 1024; // Shopify json metafield write limit (API 2026-04+)
let failed = 0;
for (const file of process.argv.slice(2)) {
  const schema = file.endsWith('.specs.json') ? SpecsSchema : file.endsWith('.faq.json') ? FaqSchema : null;
  if (!schema) { console.log(`SKIP ${basename(file)} (name must end in .specs.json or .faq.json)`); continue; }
  const raw = readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(JSON.stringify(JSON.parse(raw)));
  const res = schema.safeParse(JSON.parse(raw));
  if (res.success && bytes <= LIMIT) {
    const d: any = res.data;
    const counts = 'items' in d ? `${d.items.length} questions` : `${d.atAGlance.length} at-a-glance, ${d.summary.length} summary tiles, ${d.groups.reduce((n: number, g: any) => n + g.rows.length, 0)} spec rows`;
    console.log(`PASS ${basename(file)}  ${bytes} bytes  ${counts}`);
  } else {
    failed++;
    console.log(`FAIL ${basename(file)}  ${bytes} bytes`);
    if (!res.success) console.log(z.prettifyError(res.error));
    if (bytes > LIMIT) console.log(`  over Shopify's 128 KB json limit`);
  }
}
process.exit(failed ? 1 : 0);
