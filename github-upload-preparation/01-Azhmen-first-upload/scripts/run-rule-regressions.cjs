const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const name of ['test-firestore-rules', 'test-appointment-rules', 'test-gihani-rules', 'test-kiyathan-rules', 'test-counselor-profile-rules', 'test-notification-preference-rules', 'test-registration-rules']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, name + '.cjs')], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
