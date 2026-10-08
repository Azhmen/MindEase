const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

// Execute the actual hook with a deterministic clock and navigation lifecycle.
let now = 0, nextId = 0;
const timers = new Map();
let frame;
const navigation = { addListener: (_, listener) => {
  const owner = frame;
  owner.blur = listener;
  return () => { owner.blur = undefined; };
} };
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: id => imports[id] ?? require(id),
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return exports;
}
const hook = load('src/hooks/use-temporary-feedback.ts', {
  react: { useState: initial => {
    const owner = frame;
    if (!('value' in owner)) owner.value = initial;
    return [owner.value, value => { owner.value = value; }];
  }, useEffect: effect => { if (!frame.cleanup) frame.cleanup = effect() ?? (() => {}); } },
  'expo-router': { useNavigation: () => navigation },
});
const status = load('src/components/student-screen.tsx', {
  '@/constants/ui': { UI: { page: {} } },
  'react-native': { StyleSheet: { create: x => x } },
  '@/hooks/use-temporary-feedback': hook,
  '@/components/care-icon': {}, '@/components/appointment-reminder-banner': {},
  '@/components/text': {}, '@/components/student-ui': {},
  '@/constants/colors': { Colors: {} }, '@/constants/spacing': { Spacing: {} },
});
const render = owner => { frame = owner; return hook.useTemporaryFeedback(owner.persistent); };
function advance(ms) {
  now += ms;
  for (const [id, task] of [...timers]) if (task.at <= now) { timers.delete(id); task.callback(); }
}
for (const message of ['Mood entry deleted', 'Reflection deleted', 'Resource removed', 'Availability slot deleted', 'Appointment cancelled']) {
  const owner = {};
  assert.equal(render(owner), true, message + ' appears immediately');
  advance(2999); assert.equal(render(owner), true);
  advance(1); assert.equal(render(owner), false, message + ' disappears');
  owner.cleanup();
}
let owner = {};
render(owner); advance(1000); owner.cleanup();
assert.equal(timers.size, 0, 'replacement cancels old timer');
owner = {}; render(owner); advance(2000);
assert.equal(render(owner), true, 'old timer cannot dismiss replacement');
advance(1000); assert.equal(render(owner), false); owner.cleanup();
owner = {}; render(owner); owner.blur();
assert.equal(timers.size, 0); assert.equal(render(owner), false, 'retained screen has no stale feedback'); owner.cleanup();
owner = {}; render(owner); owner.cleanup(); assert.equal(timers.size, 0, 'unmount cleanup');
owner = { persistent: true }; render(owner); advance(10000);
assert.equal(render(owner), true, 'important errors/progress remain visible'); owner.cleanup();
// Development Strict Mode effect replay must not hide fresh messages.
owner = {}; render(owner); owner.cleanup(); owner.cleanup = undefined; render(owner);
assert.equal(render(owner), true); owner.cleanup();
const success = status.StatusMessage({ message: 'Saved successfully' });
assert.equal(success.props.persistent, false);
assert.equal(status.StatusMessage({ message: 'Failed', error: true }).props.persistent, true);
assert.equal(status.StatusMessage({ message: '' }), null);
assert.notEqual(success.key, status.StatusMessage({ message: 'Updated successfully' }).key);
assert.equal(timers.size, 0);
console.log('PASS: actual shared feedback hook/component, 3000ms success, persistent errors/progress, replacement/blur/unmount cleanup, Strict Mode replay.');
