/* فحص سريع: كل ملفات الـ JS بتتحمّل من غير أخطاء syntax */
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = readdirSync('.').filter((f) => f.endsWith('.js'));
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error('✗', f, '\n', String(e.stderr)); }
}
console.log(bad ? `${bad} ملف فيه مشكلة` : `✓ ${files.length} ملف سليم`);
process.exit(bad ? 1 : 0);
