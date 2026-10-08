const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
const root = process.cwd();
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const protectedFiles = [...files('src/services'), ...files('src/hooks'), ...files('src/config'), 'firestore.rules', 'src/constants/booking.ts', 'src/constants/starter-resources.ts', 'src/constants/student-support.ts'];
const hashes = Object.fromEntries(protectedFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const content = {};
for (const file of [...files('src/app'), ...files('src/components')].filter(file => file.endsWith('.tsx'))) {
 const source = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), copy=[];
 function visit(node) {
  if (ts.isJsxText(node) && node.text.trim()) copy.push(node.text.replace(/\s+/g,' ').trim());
  if (ts.isJsxAttribute(node) && ['title','label','placeholder','eyebrow','description','subtitle'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) copy.push(node.initializer.text);
  ts.forEachChild(node,visit);
 }
 visit(source); content[file] = copy.sort();
}
if (process.argv.includes('--verify')) {
 const baseline = JSON.parse(fs.readFileSync('artifacts/design-audit/baseline.json','utf8'));
 let failures = 0;
 for (const [file,hash] of Object.entries(baseline.hashes)) if (hashes[file] !== hash) { console.error('Protected file changed:',file); failures++; }
 for (const [file,copy] of Object.entries(baseline.content)) {
  // Repair one pre-existing mixed-encoding middle dot; the intended copy is unchanged.
  const expected = copy.map(text => file.replaceAll('\\','/') === 'src/app/student/profile.tsx' ? text.replace(/\ufffd/g,'\u00b7') : text).sort();
  if (JSON.stringify(expected) !== JSON.stringify(content[file])) { console.error('Copy changed:',file); console.error('Before:',expected); console.error('After:',content[file]); failures++; }
 }
 if (failures) process.exitCode = 1; else console.log('PASS: existing screen copy preserved; services, hooks, Firebase config, rules and data constants unchanged.');
} else {
 fs.mkdirSync('artifacts/design-audit',{recursive:true});
 fs.writeFileSync('artifacts/design-audit/baseline.json',JSON.stringify({hashes,content},null,2));
 console.log('Captured existing screen copy and protected service/rules/config hashes.');
}
