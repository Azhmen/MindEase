"""Refresh the existing member snapshots from current source; never run Git mutations."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
out = root / 'github-upload-preparation'
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').strip()
old = json.loads((out / 'manifest.json').read_text(encoding='utf-8'))
all_src = {p.relative_to(root).as_posix() for p in (root/'src').rglob('*') if p.is_file()}
azhmen = set('''src/services/mood.ts src/services/chat.ts src/services/anonymous-mood.ts src/services/anonymous-chat.ts src/services/anonymous-session.ts
src/components/mood-form.tsx src/components/mood-option-card.tsx src/components/live-chat-screen.tsx src/components/chat-ui.tsx src/components/student-live-support.tsx src/components/crisis-support-content.tsx src/components/anonymous-exit-button.tsx
src/hooks/use-counselor-threads.ts src/app/student/mood/index.tsx src/app/student/mood/edit/[id].tsx src/app/student/chat.tsx src/app/student/crisis-support.tsx
src/app/anonymous/_layout.tsx src/app/anonymous/home.tsx src/app/anonymous/mood.tsx src/app/anonymous/mood/history.tsx src/app/anonymous/mood/edit/[id].tsx src/app/anonymous/chat.tsx src/app/anonymous/crisis-support.tsx
src/app/counselor/chats.tsx src/app/counselor/chat/[threadId].tsx src/app/counselor/crisis-support.tsx src/utils/crisis-cues.ts'''.split())
tharukanan = {p for p in all_src if p.startswith('src/app/student/(booking)/')}
tharukanan.update('''src/services/appointments.ts src/services/pre-session-notes.ts src/services/appointment-reminders.ts src/services/reminder-notifications.ts src/services/reminder-notifications.native.ts src/utils/appointment-reminder-plan.ts src/components/appointment-reminder-provider.tsx src/components/appointment-reminder-banner.tsx src/components/appointment-reminder-status.tsx src/components/notification-preferences.tsx src/components/appointment-ui.tsx src/components/appointment-screens.tsx src/components/booking-draft.tsx'''.split())
gihani = set('''src/app/student/mood/history.tsx src/app/student/resources.tsx src/app/student/resources/[id].tsx src/app/student/resources/saved.tsx src/services/mood-reflections.ts src/services/resources.ts src/services/saved-resources.ts src/services/gihani-session.ts src/components/gihani-ui.tsx src/components/mood-reflection-panel.tsx src/components/mood-log-card.tsx src/components/resource-screens.tsx src/constants/starter-resources.ts src/utils/resource-search.ts src/utils/saved-resource-errors.ts src/utils/mood-rhythm.ts'''.split())
kiyathan = {p for p in all_src if p.startswith('src/app/counselor/availability/')}
kiyathan.update('''src/services/counselor-management.ts src/components/counselor-management-screens.tsx src/hooks/use-counselor-schedule.ts src/components/availability-date-picker.tsx src/components/availability-date-picker.native.tsx src/components/availability-time-picker.tsx src/components/availability-picker-ui.tsx src/utils/availability-form.ts src/app/counselor/availability.tsx src/app/counselor/sessions.tsx src/app/counselor/session/[id].tsx src/app/counselor/schedule.tsx src/app/counselor/profile.tsx src/app/counselor/support.tsx'''.split())
integration_reasons = {
 'src/app/student/home.tsx': 'Azhmen mood/support, Tharukanan reminders and appointments, Gihani resource navigation.',
 'src/app/student/profile.tsx': 'Shared identity/profile plus Tharukanan reminder preferences and other module links.',
 'src/app/student/_layout.tsx': 'Shared role shell mounts Tharukanan reminder provider.',
 'src/app/counselor/dashboard.tsx': 'Kiyathan dashboard/schedule presentation integrates Azhmen live-chat queue. Kiyathan is presentation steward; coordinate whole-file merges.',
 'src/services/user-profile.ts': 'Shared profile/auth data, counselor directory, and appointment-reminder preferences.',
 'src/constants/booking.ts': 'Booking date/topic utilities consumed by Tharukanan booking and Kiyathan availability.'}
integration = set(integration_reasons)
groups = {'Azhmen': azhmen, 'Tharukanan': tharukanan, 'Gihani': gihani, 'Kiyathan': kiyathan}
assert all(p in all_src for s in [*groups.values(), integration] for p in s)
owned = set.union(*groups.values())
assert len(owned) == sum(map(len, groups.values())) and not owned & integration
before = {p.relative_to(root).as_posix(): digest(p) for base in ('src','assets','docs','scripts') for p in (root/base).rglob('*') if p.is_file()}
env_before = digest(root/'.env') if (root/'.env').exists() else None
env_keys = sorted(set(re.findall(r'process\.env\.(EXPO_PUBLIC_FIREBASE_\w+)', (root/'src/config/firebase.ts').read_text())))
(root/'.env.example').write_text('# Copy to .env and supply your own Firebase web app settings locally.\n' + ''.join(k+'=\n' for k in env_keys), encoding='utf-8')
extras = {p.relative_to(root).as_posix() for base in ('assets','docs','scripts','.vscode') for p in (root/base).rglob('*') if p.is_file()}
extras |= {p for p in '.gitignore .env.example AGENTS.md README.md LICENSE package.json package-lock.json app.json eas.json tsconfig.json eslint.config.js firebase.emulator.json firestore.rules'.split() if (root/p).is_file()}
shared = (all_src - owned - integration) | extras
ownership = {**groups, 'Shared/Common': shared, 'Integration': integration}
packages = {'01-Azhmen-first-upload': all_src | extras, **{n:s for n,s in groups.items() if n != 'Azhmen'}}
legacy = {}
old_hashes = old.get('source_sha256', old.get('original_sha256', {}))
# Refuse to overwrite independently edited prepared files, but permit previous snapshots.
for name, paths in packages.items():
    dest = out/name
    retained = {p.relative_to(dest).as_posix() for p in dest.rglob('*') if p.is_file()} - paths
    legacy[name] = sorted(retained)
    for rel in paths | retained:
        target = dest/rel
        source = root/rel
        if not source.is_file():
            raise RuntimeError('Retained copy has no current source; resolve manually: '+str(target))
        if target.exists() and rel not in ('.gitignore','.env.example'):
            assert digest(target) in {old_hashes.get(rel), digest(source)}, 'Independently edited prepared copy: '+str(target)
for name, paths in packages.items():
    for rel in paths | set(legacy[name]):
        target = out/name/rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root/rel, target)
        assert digest(target) == digest(root/rel)
    if name != '01-Azhmen-first-upload':
        with zipfile.ZipFile(out/(name+'.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
            for rel in sorted(paths):
                z.write(out/name/rel, name+'/'+rel)
        with zipfile.ZipFile(out/(name+'.zip')) as z:
            assert len(z.namelist()) == len(paths)
            for rel in paths:
                assert hashlib.sha256(z.read(name+'/'+rel)).hexdigest() == digest(root/rel)
latest = {
 'src/components/appointment-screens.tsx':'Tharukanan',
 'src/components/resource-screens.tsx':'Gihani',
 'src/components/counselor-management-screens.tsx':'Kiyathan',
 'src/components/live-chat-screen.tsx':'Azhmen',
 'src/components/mood-reflection-panel.tsx':'Gihani',
 'src/components/mood-log-card.tsx':'Gihani',
 'src/app/student/mood/history.tsx':'Gihani'}
assert all(p in groups[n] for p,n in latest.items())
cross = []
owner_for = {p:n for n,paths in ownership.items() for p in paths}
for rel in sorted(all_src):
    for spec in re.findall(r'(?:from\s+|import\s*)[\'\"]([^\'\"]+)[\'\"]', (root/rel).read_text(encoding='utf-8')):
        if spec.startswith('@/'):
            base = 'src/'+spec[2:]
        elif spec.startswith('.'):
            base = (Path(rel).parent/spec).as_posix()
            base = str(Path(base)).replace('\\','/')
        else:
            continue
        candidates = {base+ext for ext in ('.ts','.tsx','.native.ts','.native.tsx','/index.ts','/index.tsx')}
        for target in sorted(candidates & all_src):
            if owner_for[rel] != owner_for[target]:
                cross.append({'file':rel,'owner':owner_for[rel],'imports':target,'dependency_owner':owner_for[target]})
manifest = {
 'version':2,'updated':'2026-10-08','ownership':{n:sorted(s) for n,s in ownership.items()},
 'files':{n:sorted(s) for n,s in packages.items()},'shared_source':sorted(shared & all_src),
 'integration_reasons':integration_reasons,'latest_reliability_files':latest,
 'cross_owner_imports':cross,'legacy_retained_copies_not_for_upload':legacy,
 'source_sha256':{p:digest(root/p) for p in sorted(all_src|extras)},
 'original_sha256':old.get('original_sha256', {}),
 'branch_plan':['main','member/azhmen','member/tharukanan','member/gihani','member/kiyathan'],
 'existing_branches':git('branch','--format=%(refname:short) %(objectname:short)').splitlines(),
 'remote_configuration':git('remote','-v').splitlines(),
 'generated_shared_not_for_staging':['expo-env.d.ts'],
 'excluded_local':['.env','.env.* (except .env.example)','node_modules/','.expo/','dist/','tmp/','artifacts/','coverage/','logs','service-account credentials'],
 'conflicts_resolved':['Regression/preview scripts belong only to Shared/Common.', 'Legacy first-upload folder is now a complete integration snapshot, not Azhmen exclusive ownership.', 'Mixed dashboard/profile/layout/profile-service/booking-utility files belong on main.', 'New reliability, reminder and picker files assigned by implementation/imports.']}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
guide = ['# MindEase final Git/member ownership','', 'Updated 2026-10-08. This replaces the previous staged-overlay instructions. Canonical working application files are the source of truth. No push, branch mutation, reset, rebase or app change is performed by preparation.', '',
 '## Existing structure and safe use','', '`01-Azhmen-first-upload` keeps its historical name but now contains the COMPLETE current integration snapshot. Its copies do not give Azhmen exclusive ownership. Member ZIPs contain only that member’s active ownership files. Shared infrastructure/tests appear only in the Shared/Common ownership list. Old member-folder test copies are retained and refreshed to avoid deleting existing work; they are excluded from ZIPs and active manifests. Do not blindly upload entire legacy member folders.', '',
 '`manifest.json` is the machine-readable source of truth and records SHA-256 hashes, active package entries, retained legacy entries, and cross-owner imports. Re-run `python github-upload-preparation/prepare.py` to refresh in place; independently edited prepared source copies cause an error. No second split is created.', '',
 'Only local `main` exists at inspection (initial commit 2f236e1); no remote is configured. The old guide named https://github.com/Azhmen/MindEase, which is not a configured remote. Proposed branches: `main`, `member/azhmen`, `member/tharukanan`, `member/gihani`, `member/kiyathan`. Shared/Common and Integration changes belong on main.', '']
for i,(name,paths) in enumerate(ownership.items(),1):
    guide += [f'## {i}. {name}', '', '```text', *sorted(paths), '```', '']
    if name == 'Shared/Common':
        guide += ['`expo-env.d.ts` is shared/generated and intentionally not staged or packaged. Git preparation scripts, manifests, ZIPs, pathspecs, this guide and status reports under `github-upload-preparation/` are shared organization artifacts, not member-exclusive feature implementation.', '']
    if name == 'Integration':
        guide += [f'- `{p}`: {reason}' for p,reason in integration_reasons.items()] + ['']
guide += ['## 7. Latest modified reliability files','', *[f'- `{p}` → {n}; refreshed source/copy/ZIP hashes verified.' for p,n in latest.items()], '- All `scripts/` regression and preview files → Shared/Common.', '',
 '## 8. Files requiring coordinated merge','',
 'All six Integration files require coordinated review. Kiyathan is dashboard presentation steward while Azhmen owns its imported chat feature. `appointment-ui.tsx`, mood option/form components and `gihani-ui.tsx` have cross-module consumers; changes must retain imported exports. Appointment screens consume Kiyathan availability read-only; mood history reads Azhmen mood entries without taking CRUD ownership. The full dependency list is `cross_owner_imports` in the manifest. Shared theme, care-icon, role layouts, Firebase, package files and regression scripts must merge on main.', '',
 '## Current Git state and exclusions','',
 '`git-status.json` records every modified/new/deleted/untracked path, including pre-existing tracked temporary-file deletions and preview modifications. These are not staged by the recommended ownership pathspecs. `.env` was already tracked: `.gitignore` does not untrack it. `git rm --cached -- .env` keeps the local file and removes it from future commits. Its historical exposure is unresolved; inspect before publishing without rewriting history automatically. The preparation never reads or prints environment values.', '',
 'TypeScript and lint passed; 20 non-emulator regressions passed. Firestore-rule regressions need the Firebase emulator and are not claimed as live rule validation. Application functionality, rules and source bytes were unchanged by this task.', '',
 '## Recommended commands (review before executing; not performed)','',
 'Do not use `git add .` or `git add -A`. Literal NUL pathspecs safely handle Expo route brackets/parentheses. Commit shared/integration first, then stage each canonical member subset on its branch using clean worktrees. Do not stage the complete integration snapshot as member-owned source.', '',
 '```powershell', 'git status --short', 'git diff --stat', 'git rm --cached -- .env', 'git add --pathspec-from-file="github-upload-preparation/pathspecs/main.nul" --pathspec-file-nul', 'git diff --cached --stat', 'git commit -m "Prepare final shared infrastructure and integration"', '```', '',
 'After rechecking that member branches still do not exist, create clean worktrees from that main commit:', '', '```powershell']
for name in groups:
    slug=name.lower()
    guide += [f'git worktree add -b member/{slug} ../mindease-{slug} main']
guide += ['```', '', 'Copy ONLY paths in `manifest.json` → `ownership` → the member name from this canonical workspace to its clean worktree, preserving relative paths. Verify source hashes against `source_sha256`; do not copy any `.env`, generated output, another member’s code or existing `.git` directory. Stop if a worktree is dirty or contains another member’s changes. Then:', '', '```powershell']
for name in groups:
    slug=name.lower()
    guide += [f'git -C ../mindease-{slug} add --pathspec-from-file="../mindease-expo/github-upload-preparation/pathspecs/{slug}.nul" --pathspec-file-nul', f'git -C ../mindease-{slug} diff --cached --stat', f'git -C ../mindease-{slug} commit -m "Finalize {name} feature implementation"']
guide += ['```', '', 'After review, preserve current member working changes before merging their committed versions (keep the stash until verification; do not automatically drop/pop it):', '', '```powershell', 'git stash push --include-untracked -m "Preserve current final member files before integration" --pathspec-from-file="github-upload-preparation/pathspecs/members.nul" --pathspec-file-nul']
guide += [f'git merge --no-ff member/{name.lower()} -m "Integrate final {name} features"' for name in groups]
guide += ['npx tsc --noEmit','npm run lint','git status --short','```','','No push command is included. Existing unrelated deletions/generated outputs remain untouched and unstaged. Review merge conflicts manually; no force push, reset, destructive rebase or branch deletion.']
(out/'UPLOAD-GUIDE.md').write_text('\n'.join(guide)+'\n',encoding='utf-8')
pathdir=out/'pathspecs'
pathdir.mkdir(exist_ok=True)
metadata={'github-upload-preparation/'+p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()}
metadata |= {'github-upload-preparation/git-status.json'} | {'github-upload-preparation/pathspecs/'+n+'.nul' for n in ['main','members',*[n.lower() for n in groups]]}
stage_groups={**{n.lower():s for n,s in groups.items()},'members':owned,'main':shared|integration|metadata}
for name,paths in stage_groups.items():
    (pathdir/(name+'.nul')).write_bytes(b''.join((':(literal)'+p).encode('utf-8')+b'\0' for p in sorted(paths)))
status_raw=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all'],cwd=root).decode('utf-8')
records=[]
tokens=iter(status_raw.split('\0'))
for token in tokens:
    if not token: continue
    record={'status':token[:2],'path':token[3:]}
    if 'R' in token[:2] or 'C' in token[:2]: record['original_path']=next(tokens)
    records.append(record)
categories={'modified':[r for r in records if 'M' in r['status']], 'new':[r for r in records if 'A' in r['status']], 'deleted':[r for r in records if 'D' in r['status']], 'untracked':[r for r in records if r['status']=='??']}
(out/'git-status.json').write_text(json.dumps({'records':records,'categories':categories,'counts':{n:len(s) for n,s in categories.items()}},indent=2)+'\n',encoding='utf-8')
assert all(digest(root/p)==sha for p,sha in before.items()), 'Canonical source changed'
assert env_before is None or digest(root/'.env')==env_before, 'Local environment changed'
assert all_src == owned | (shared & all_src) | integration
for name,paths in ownership.items(): print(name+': '+str(len(paths))+' canonical paths')
print('Verified '+str(len(before))+' original source/assets/docs/scripts unchanged; all copies and member ZIPs match current source.')
print('Git status counts: '+json.dumps({n:len(s) for n,s in categories.items()}))
