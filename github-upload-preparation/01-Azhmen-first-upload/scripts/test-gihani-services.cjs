// Actual TypeScript services, isolated in-memory Firestore boundary. Not deployed-rule tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
const rows = new Map(), cache = {};
let ids = 0, clock = 0, failCommit = false;
const loggedErrors = [];
function ref(key) { return { key, id: key.split('/').at(-1) }; }
function snapshot(reference) { return { exists: () => rows.has(reference.key), data: () => rows.get(reference.key), id: reference.id }; }
const api = {
  collection: (base, ...parts) => ref([base.key ?? '', ...parts].filter(Boolean).join('/')),
  doc: (base, ...parts) => ref([base.key ?? '', ...(parts.length ? parts : [String(++ids)])].filter(Boolean).join('/')),
  getDoc: async reference => snapshot(reference),
  where: (field, _, value) => ({ field, value }),
  query: (reference, filter) => ({ reference, filter }),
  getDocs: async input => {
    const reference = input.reference ?? input;
    return { docs: [...rows].filter(([key, data]) => key.startsWith(reference.key + '/') && !key.slice(reference.key.length + 1).includes('/') && (!input.filter || data[input.filter.field] === input.filter.value)).map(([key]) => snapshot(ref(key))) };
  },
  writeBatch: () => { const pending = []; return { delete: reference => pending.push(reference.key), commit: async () => { if (failCommit) { failCommit = false; throw new Error('Simulated network failure'); } pending.forEach(key => rows.delete(key)); } }; },
  serverTimestamp: () => { const value = ++clock; return { toMillis: () => value }; },
  runTransaction: async (_, callback) => {
    const pending = [];
    await callback({
      get: async reference => snapshot(reference),
      set: (reference, data) => pending.push([reference.key, data]),
      update: (reference, data) => pending.push([reference.key, { ...rows.get(reference.key), ...data }]),
      delete: reference => pending.push([reference.key, null]),
    });
    if (failCommit) { failCommit = false; throw new Error('Simulated network failure'); }
    pending.forEach(([key, data]) => data === null ? rows.delete(key) : rows.set(key, data));
  },
};
function load(name) {
  if (cache[name]) return cache[name];
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name + '.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Error, __DEV__: true, console: { error: (...args) => loggedErrors.push(args) }, require: id => id === 'firebase/firestore' ? api : id === 'firebase/app' ? require('firebase/app') : id === '@/config/firebase' ? { db: {}, auth } : id === '@/services/auth' ? { getCurrentUser: () => auth.currentUser } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
async function test() {
  const reflections = load('services/mood-reflections');
  const resources = load('services/resources');
  const saved = load('services/saved-resources');
  rows.set('users/student-a', { role: 'student' });
  rows.set('users/student-b', { role: 'student' });
  rows.set('users/counselor-a', { role: 'counselor' });
  rows.set('mood_entries/mood-a', { userId: 'student-a', mood: 'Good', note: 'Original mood', createdAt: api.serverTimestamp() });
  rows.set('mood_entries/mood-b', { userId: 'student-b', mood: 'Low', note: 'Another student' });
  const originalMood = rows.get('mood_entries/mood-a');
  await assert.rejects(reflections.createMoodReflection('mood-a', '   '), /1,000/);
  await assert.rejects(reflections.createMoodReflection('mood-a', 'x'.repeat(1001)), /1,000/);
  await assert.rejects(reflections.createMoodReflection('missing', 'Text'), /own existing/);
  await assert.rejects(reflections.createMoodReflection('mood-b', 'Foreign'), /own existing/);
  await reflections.createMoodReflection('mood-a', '  A calmer perspective  ');
  let reflection = (await reflections.getMoodReflectionsForUser())[0];
  assert.equal(reflection.reflection, 'A calmer perspective');
  assert.equal(reflection.userId, 'student-a'); assert.equal(reflection.moodEntryId, 'mood-a');
  const createdAt = reflection.createdAt;
  await assert.rejects(reflections.createMoodReflection('mood-a', 'Duplicate'), /already exists/);
  await reflections.updateMoodReflection('mood-a', '  Updated perspective  ');
  reflection = (await reflections.getMoodReflectionsForUser())[0];
  assert.equal(reflection.reflection, 'Updated perspective'); assert.equal(reflection.createdAt, createdAt);
  assert.equal(rows.get('mood_entries/mood-a'), originalMood, 'Reflection edits never mutate mood_entries');
  auth.currentUser = { uid: 'student-b', isAnonymous: false };
  assert.equal((await reflections.getMoodReflectionsForUser()).length, 0);
  await assert.rejects(reflections.updateMoodReflection('mood-a', 'Foreign'), /own/);
  await assert.rejects(reflections.deleteMoodReflection('mood-a'), /own/);
  auth.currentUser = { uid: 'student-a', isAnonymous: false };
  delete cache['services/mood-reflections'];
  assert.equal((await load('services/mood-reflections').getMoodReflectionsForUser())[0].reflection, 'Updated perspective', 'Reloaded service reads persisted reflection');
  await reflections.deleteMoodReflection('mood-a');
  assert.equal((await reflections.getMoodReflectionsForUser()).length, 0);
  assert.equal(rows.get('mood_entries/mood-a'), originalMood, 'Reflection deletion leaves original check-in intact');
  await reflections.createMoodReflection('mood-a', 'Orphan cleanup');
  rows.delete('mood_entries/mood-a'); // Simulate deletion by Azhmen, not Gihani.
  await reflections.deleteMoodReflection('mood-a');

  const library = await resources.getResources();
  assert.equal(library.source, 'starter'); assert.equal(library.resources.length, 12);
  assert.equal(new Set(library.resources.map(item => item.category)).size, 12);
  const { filterResources } = load('utils/resource-search');
  assert.equal(filterResources(library.resources, 'Sleep', 'wind').length, 1);
  assert.equal(filterResources(library.resources, 'Sleep', 'exam').length, 0);
  assert.ok(filterResources(library.resources, 'All', '  HOMESICKNESS  ').length);
  assert.equal(filterResources(library.resources, 'All', 'no-match-phrase').length, 0);
  assert.ok(library.resources.filter(item => item.featured).length >= 3);
  const starter = library.resources[0];
  await assert.rejects(saved.saveResource('not-a-resource'), /no longer available/);
  const originalGetDoc = api.getDoc;
  api.getDoc = async reference => { if (reference.key.startsWith('resources/')) throw new Error('Missing catalog reads denied'); return originalGetDoc(reference); };
  failCommit = true;
  await assert.rejects(saved.saveResource(starter.id), /Unable to save this resource.*network failure/);
  assert.equal((await saved.getSavedResources()).length, 0, 'Failed commit never shows a saved record');
  const savedId = await saved.saveResource(starter.id);
  api.getDoc = originalGetDoc;
  assert.ok(loggedErrors.some(([context, error]) => context.includes('Unable to save') && error.message.includes('network failure')), 'Original errors are logged in development');
  await Promise.all([saved.saveResource(starter.id), saved.saveResource(starter.id)]);
  assert.equal((await saved.getSavedResources()).length, 1, 'Duplicate Save is idempotent');
  let entry = (await saved.getSavedResources())[0];
  assert.equal(entry.favorite, false); assert.equal(entry.personalNote, '');
  assert.equal(Object.keys(rows.get('saved_resources/' + savedId)).sort().join(','), 'favorite,personalNote,resourceId,savedAt,updatedAt,userId');
  const savedAt = entry.savedAt;
  await saved.setSavedResourceFavorite(savedId, true);
  assert.equal((await saved.getSavedResources())[0].favorite, true);
  await saved.updateSavedResourcePersonalNote(savedId, '  This helped me pause  ');
  entry = (await saved.getSavedResources())[0];
  assert.equal(entry.personalNote, 'This helped me pause'); assert.equal(entry.savedAt, savedAt); assert.equal(entry.favorite, true);
  await assert.rejects(saved.updateSavedResourcePersonalNote(savedId, 'x'.repeat(1001)), /1,000/);
  await saved.setSavedResourceFavorite(savedId, false);
  assert.equal((await saved.getSavedResources())[0].favorite, false);
  await saved.updateSavedResourcePersonalNote(savedId, '   ');
  assert.equal((await saved.getSavedResources())[0].personalNote, '', 'Optional personal note can be cleared');
  rows.set('saved_resources/student-a_legacy', { userId: 'student-a', resourceId: 'legacy', savedAt, completed: true, completedAt: api.serverTimestamp(), reflection: 'Keep my old text', updatedAt: api.serverTimestamp() });
  assert.equal((await saved.getSavedResources()).find(item => item.resourceId === 'legacy').personalNote, 'Keep my old text');
  await saved.setSavedResourceFavorite('student-a_legacy', true);
  const migrated = rows.get('saved_resources/student-a_legacy');
  assert.equal(migrated.personalNote, 'Keep my old text'); assert.equal(migrated.favorite, true); assert.equal(migrated.savedAt, savedAt);
  assert.ok(!('completed' in migrated) && !('completedAt' in migrated) && !('reflection' in migrated));
  await saved.removeSavedResource('legacy');
  rows.set('resources/published', { title: 'Original campus guide', category: 'Focus', description: 'A short original description.', summary: 'A brief original practice.', active: true, featured: true });
  const originalResource = rows.get('resources/published');
  const campusLibrary = await resources.getResources();
  assert.equal(campusLibrary.source, 'firestore'); assert.equal(campusLibrary.resources.length, 1); assert.equal(campusLibrary.resources[0].featured, true);
  rows.set('saved_resources/old-random-id', { userId: 'student-a', resourceId: 'published', savedAt, personalNote: 'Existing note', favorite: false, updatedAt: api.serverTimestamp() });
  const publishedSaveId = await saved.saveResource('published');
  assert.equal(publishedSaveId, 'old-random-id', 'Save reuses legacy document IDs');
  assert.ok(!rows.has('saved_resources/student-a_published'));
  rows.set('saved_resources/old-duplicate-id', { ...rows.get('saved_resources/old-random-id') });
  await saved.updateSavedResourcePersonalNote(publishedSaveId, 'Helpful');
  await saved.setSavedResourceFavorite(publishedSaveId, true);
  await saved.removeSavedResource('published');
  assert.ok(!rows.has('saved_resources/old-random-id') && !rows.has('saved_resources/old-duplicate-id'), 'Removal finds all actual owned document IDs');
  assert.equal(rows.get('resources/published'), originalResource, 'Saved edits/deletion never modify original resources');
  delete cache['services/saved-resources'];
  assert.equal((await load('services/saved-resources').getSavedResources())[0].id, savedId, 'Reload reads persisted saved data');
  auth.currentUser = { uid: 'student-b', isAnonymous: false };
  assert.equal((await saved.getSavedResources()).length, 0);
  for (const operation of [
    () => saved.setSavedResourceFavorite(savedId, true), () => saved.updateSavedResourcePersonalNote(savedId, 'Foreign'),
  ]) await assert.rejects(operation(), /own saved/);
  await saved.removeSavedResource(starter.id);
  assert.ok(rows.has('saved_resources/' + savedId), 'Another student cannot remove the first student bookmark');
  const secondStudentSave = await saved.saveResource(starter.id);
  assert.notEqual(secondStudentSave, savedId);
  auth.currentUser = { uid: 'student-a', isAnonymous: false };
  failCommit = true;
  await assert.rejects(saved.removeSavedResource(starter.id), /Unable to remove this resource.*network failure/);
  assert.ok(rows.has('saved_resources/' + savedId));
  await saved.removeSavedResource(starter.id);
  await saved.removeSavedResource(starter.id); // safe repeated removal
  delete cache['services/saved-resources'];
  assert.equal((await load('services/saved-resources').getSavedResources()).length, 0, 'Removal persists after reload');
  assert.equal((await saved.getSavedResources()).length, 0);
  assert.equal((await resources.getResource(starter.id)).title, starter.title, 'Starter resource remains after removing saved record');
  rows.set('resources/' + starter.id, { ...starter, active: false });
  assert.equal(await resources.getResource(starter.id), null, 'Inactive published override does not silently use starter fallback');
  await saved.saveResource(starter.id); // local bookmarks do not depend on a published override
  await saved.removeSavedResource(starter.id);
  rows.set('resources/published', { ...originalResource, active: false });
  assert.equal((await resources.getResources()).resources.length, 0, 'Inactive-only Firestore catalog has a clean empty state');
  const originalRead = api.getDocs;
  const denied = new (require('firebase/app').FirebaseError)('permission-denied', 'Denied for testing');
  api.getDocs = async input => { if ((input.reference ?? input).key === 'saved_resources') throw denied; return originalRead(input); };
  await assert.rejects(saved.saveResource(starter.id), error => error.cause === denied && error.message.includes('Unable to save this resource.') && error.message.includes('Firebase denied access'));
  await assert.rejects(saved.removeSavedResource(starter.id), error => error.cause === denied && error.message.includes('Unable to remove this resource.'));
  assert.ok(loggedErrors.some(([, error]) => error === denied && error.code === 'permission-denied'), 'Development logging preserves real Firebase code and error object');
  api.getDocs = async () => { throw new Error('Simulated Firebase permission error'); };
  await assert.rejects(resources.getResources(), /permission/, 'Errors must not silently switch to starter resources');
  api.getDocs = originalRead;
  for (const user of [{ uid: 'counselor-a' }, { uid: 'guest-a', isAnonymous: true }, null]) {
    auth.currentUser = user;
    await assert.rejects(saved.getSavedResources(), /student account/);
    await assert.rejects(reflections.getMoodReflectionsForUser(), /student account/);
    await assert.rejects(resources.getResources(), /student account/);
  }
  console.log('PASS: reflection CRUD/ownership/reload; original mood unchanged; saved CRUD/idempotency/personal-note/favorite/legacy-upgrade/reload; search/categories/featured; original resources unchanged; starter/Firestore/empty/error behavior; student-only access.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
