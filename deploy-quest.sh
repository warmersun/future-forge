#!/usr/bin/env bash
# Deploy one .ffquest to production: private Neon quests and Warmer Sun lessons.
# Usage: ./deploy-quest.sh <package.ffquest> [--yes] [--dry-run] [--force]
#        [--allow-external-lessons] [--source <id>] [--package-adapter <module>]
#        [--plan-dir <new-directory>] (v2 --dry-run only)
# V2 dry-run validates and builds an offline loose-publication plan. --plan-dir
# saves it locally. V2 production requires a live runtime health marker.
# --force bypasses economy checks and permits replacing mutable collisions.
# FF_REPO and WARMERSUN_DIR may override the checkout locations.
set -euo pipefail
# Projections include gated quest text; do not make new plan files world-readable.
umask 077

usage() { sed -n '2,10p' "${BASH_SOURCE[0]}"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
FF_REPO="$(cd "${FF_REPO:-$ROOT}" && pwd -P)"
WARMERSUN_DIR="$(cd "${WARMERSUN_DIR:-${FF_WARMERSUN_DIR:-$HOME/dev/warmersun}}" && pwd -P)"
export FF_REPO
PKG='' SOURCE='' ADAPTER='' PLAN_DIR='' YES=0 DRY=0 FORCE=0 EXTERNAL=0
while (($#)); do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --production|--prod) shift ;;
    --staging|--stage) die "staging is no longer supported; use scripts/sideload-local-package.sh" ;;
    --yes) YES=1; shift ;;
    --dry-run|--no-publish) DRY=1; shift ;;
    --force) FORCE=1; shift ;;
    --allow-external-lessons) EXTERNAL=1; shift ;;
    --source|--package-adapter|--plan-dir)
      opt="$1"; (($# >= 2)) && [[ -n "$2" && "$2" != --* ]] || die "$opt requires a value"
      case "$opt" in --source) SOURCE="$2" ;; --package-adapter) ADAPTER="$2" ;; --plan-dir) PLAN_DIR="$2" ;; esac
      shift 2 ;;
    --plan-dir=*) PLAN_DIR="${1#*=}"; [[ -n "$PLAN_DIR" ]] || die "--plan-dir requires a value"; shift ;;
    --source=*) SOURCE="${1#*=}"; [[ -n "$SOURCE" ]] || die "--source requires a value"; shift ;;
    --package-adapter=*) ADAPTER="${1#*=}"; [[ -n "$ADAPTER" ]] || die "--package-adapter requires a value"; shift ;;
    -*) die "unknown option: $1" ;;
    *) [[ -z "$PKG" ]] || die "only one package is allowed"; PKG="$1"; shift ;;
  esac
done
[[ -n "$PKG" && -f "$PKG" && "$PKG" == *.ffquest ]] || die "provide an existing .ffquest file"
[[ -f "$FF_REPO/scripts/quest-package.py" ]] || die "quest-package.py not found in $FF_REPO"
[[ -x "$WARMERSUN_DIR/scripts/gated-deploy-package.sh" ]] || die "missing Warmer Sun gated-deploy-package.sh"
[[ -z "$SOURCE" || "$SOURCE" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "invalid source id"
PKG="$(cd "$(dirname "$PKG")" && pwd -P)/$(basename "$PKG")"
[[ -z "$ADAPTER" ]] || ADAPTER="$(realpath "$ADAPTER")"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/deploy-quest.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
# Use one immutable local snapshot across verify, acceptance and projection.
cp -- "$PKG" "$WORK/input.ffquest"
PKG="$WORK/input.ffquest"
[[ -z "$PLAN_DIR" || ! -e "$PLAN_DIR" && ! -L "$PLAN_DIR" ]] || die "--plan-dir must not exist"
ALLOW=(); ((EXTERNAL == 0)) || ALLOW+=(--allow-external-lessons)
python3 "$FF_REPO/scripts/quest-package.py" verify "$PKG" "${ALLOW[@]}"
# Verification above is authoritative; inspect --json rejects external lessons
# even when verify was explicitly allowed to accept them.
python3 - "$PKG" "$WORK/meta.json" <<'PYMANIFEST'
import json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    manifest = json.loads(archive.read('manifest.json'))
with open(sys.argv[2], 'w', encoding='utf-8') as out:
    json.dump({'manifest': manifest}, out)
PYMANIFEST
readarray -t INFO < <(python3 - "$WORK/meta.json" <<'PYMETA'
import json, sys
m = json.load(open(sys.argv[1], encoding='utf-8'))['manifest']
print(m['id'])
print(m['version'])
print(len(m.get('lessons') or []))
PYMETA
)
ID="${INFO[0]}" VERSION="${INFO[1]}" LESSONS="${INFO[2]}"
printf 'Package: %s (v%s; %s lesson folders)\n' "$ID" "$VERSION" "$LESSONS"
case "$VERSION" in 1|2) ;; *) die "unsupported package version: $VERSION" ;; esac
if [[ "$VERSION" == 2 ]]; then
  [[ -z "$SOURCE" || "$SOURCE" == spotlights ]] || die "v2 does not support --source"
  ((EXTERNAL == 0)) || die "v2 publisher does not support external lessons"
  if ((DRY == 0)); then
    [[ -z "$PLAN_DIR" ]] || die "--plan-dir is only supported for v2 --dry-run"
    [[ -z "$ADAPTER" ]] || die "--package-adapter is not supported for v2 loose publication"
    python3 - "$WORK/meta.json" <<'PYMODULE'
import json, sys
m = json.load(open(sys.argv[1]))['manifest']
if any(q.get('kind') == 'module' for q in m.get('quests', [])):
    raise SystemExit('Module wrappers are unsupported; refusing partial publication')
PYMODULE
  fi
else
  [[ -z "$PLAN_DIR" ]] || die "--plan-dir is only supported for v2 --dry-run"
  [[ -z "$ADAPTER" ]] || die "--package-adapter is only supported for v2"
fi
ARGS=("$PKG")
((FORCE == 0)) || ARGS+=(--force)
((EXTERNAL == 0)) || ARGS+=(--allow-external-lessons)
[[ -z "$SOURCE" ]] || ARGS+=(--source "$SOURCE")
[[ -z "$ADAPTER" ]] || ARGS+=(--package-adapter "$ADAPTER")
if ((DRY)) || [[ "$VERSION" == 2 ]]; then
  if [[ "$VERSION" == 2 ]]; then
    # The v2 publisher performs the same craft and economy checks without writes.
    V2ARGS=("$PKG" --dry-run); ((FORCE == 0)) || V2ARGS+=(--force)
    node "$FF_REPO/scripts/publish-quest-package.mjs" "${V2ARGS[@]}"
    REVISION="$(python3 - "$WORK/meta.json" <<'PYREV'
import json, re, sys
value = json.load(open(sys.argv[1]))['manifest']['revision']
if not re.fullmatch(r'sha256:[0-9a-f]{64}', value): raise SystemExit('Invalid package revision')
print(value[7:])
PYREV
)"
    python3 "$FF_REPO/scripts/quest-package.py" unpack "$PKG" "$WORK/unpacked" \
      --lesson-root https://warmersun.com/lessons/ \
      --asset-root "https://warmersun.com/quests/spotlights/assets/$ID/$REVISION/"
    python3 - "$WORK/unpacked" "$WORK/plan" <<'PYPLAN'
import hashlib, json, re, shutil, sys
from pathlib import Path
src, out = map(Path, sys.argv[1:])
m = json.loads((src / 'raw/manifest.json').read_text(encoding='utf-8'))
out.mkdir()
banks = {}
for row in m['predictions']:
    bank_id = row['id']
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', bank_id):
        raise SystemExit('Unsafe prediction bank id')
    data = (src / 'raw' / row['file']).read_bytes()
    if json.loads(data).get('id') != bank_id:
        raise SystemExit('Prediction bank identity mismatch')
    digest = hashlib.sha256(data).hexdigest()
    target = out / 'predictions' / bank_id / (digest + '.json')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    banks[bank_id] = {'id': bank_id, 'sha256': digest,
                      'url': f'https://warmersun.com/predictions/{bank_id}/{digest}.json'}
quests = []
for row in m['quests']:
    doc = json.loads((src / row['file']).read_text(encoding='utf-8'))
    bank_id = doc.get('predictionBankId')
    if row.get('kind') != 'module':
        if bank_id not in banks: raise SystemExit('Quest bank missing')
        ref = {k: banks[bank_id][k] for k in ('id', 'sha256')}
        if 'predictionBankRef' in doc and doc['predictionBankRef'] != ref:
            raise SystemExit('Conflicting predictionBankRef')
        doc['predictionBankRef'] = ref
    target = out / row['file']
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    quests.append({'id': row['id'], 'file': row['file'], 'predictionBankRef': doc.get('predictionBankRef')})
for name in ('lessons', 'assets'):
    if (src / name).is_dir(): shutil.copytree(src / name, out / name)
plan = {'packageId': m['id'], 'packageRevision': m['revision'],
        'quests': quests, 'banks': list(banks.values()),
        'lessonFiles': sorted(str(p.relative_to(out)) for p in (out / 'lessons').rglob('*') if p.is_file()),
        'assetFiles': sorted(str(p.relative_to(out)) for p in (out / 'assets').rglob('*') if p.is_file()),
        'publishable': False, 'notice': 'Projection only; production requires live runtime and public-byte verification.'}
(out / 'plan.json').write_text(json.dumps(plan, indent=2) + '\n', encoding='utf-8')
print(json.dumps(plan, indent=2))
PYPLAN
    # Validate the exact retained quest and bank projection before public writes.
    if ((DRY == 0)); then
      (cd "$FF_REPO" && node "$FF_REPO/scripts/publish-loose-quests.mjs" "$WORK/plan" --dry-run)
    fi
    if [[ -n "$PLAN_DIR" ]]; then
      # Exclusive mkdir prevents replacing a caller's existing files.
      mkdir -- "$PLAN_DIR" || die "cannot create --plan-dir"
      cp -R -- "$WORK/plan/." "$PLAN_DIR/"
      printf 'Offline plan saved to %s\n' "$PLAN_DIR"
    fi

  else
    # Do not call gated-deploy --no-publish: it still writes to lesson-src/.
    python3 "$FF_REPO/scripts/quest-package.py" unpack "$PKG" "$WORK/unpacked" \
      --lesson-root https://warmersun.com/lessons/ \
      --asset-root "https://warmersun.com/quests/${SOURCE:-spotlights}/assets/" "${ALLOW[@]}"
    PUBARGS=("$WORK/unpacked/quests" --dry-run); ((FORCE == 0)) || PUBARGS+=(--skip-economy)
    (cd "$FF_REPO" && npm run publish:quest -- "${PUBARGS[@]}")
  fi
  if ((DRY)) && [[ -n "$PLAN_DIR" ]]; then
    echo 'Dry run complete; only the requested local plan was written; nothing published.'
  elif ((DRY)); then
    echo 'Dry run complete; no files landed and nothing published.'
  fi
  ((DRY == 0)) || exit 0
fi
if ((YES == 0)); then
  [[ -t 0 ]] || die 'production deployment requires --yes in a non-interactive shell'
  read -r -p "Deploy $ID to production Neon and Warmer Sun? Type yes: " reply
  [[ "$reply" == yes ]] || die 'deployment cancelled'
fi
if [[ "$VERSION" == 2 ]]; then
  python3 - <<'PYHEALTH'
import json, time, urllib.request
url = 'https://cloud.warmersun.com/api/health?deploy_check=' + str(time.time_ns())
try:
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'Pragma': 'no-cache'})
    with urllib.request.urlopen(req, timeout=30) as res: data = json.load(res)
    if data.get('ok') is not True or data.get('service') != 'portal' or data.get('features', {}).get('looseQuestV2') is not True:
        raise ValueError('required health marker absent')
except Exception as exc:
    raise SystemExit(f'Live runtime readiness verification failed: {exc}')
print('Live runtime marker verified; authenticated end-to-end behavior is not established.')
PYHEALTH
  # Match the legacy publisher's optional local credential sources without
  # printing their contents. The live portal remains the target authority.
  ENV_FILES=()
  [[ ! -f "$FF_REPO/.env.portal" ]] || ENV_FILES+=("--env-file=$FF_REPO/.env.portal")
  [[ ! -f "$FF_REPO/.env.object-storage.local" ]] || ENV_FILES+=("--env-file=$FF_REPO/.env.object-storage.local")
  # The loose publisher does not itself refuse replacement of an existing ID.
  (cd "$FF_REPO" && node "${ENV_FILES[@]}" --input-type=module - "$WORK/plan" "$FORCE" <<'JSCOLLISION'
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createNeonLooseAdapter } from './js/server/publish-loose-quest.mjs';
import { questsBucketFromEnv, questsObjectPrefixFromEnv, joinObjectKey } from './js/server/quest-object-storage.mjs';
const [dir, force] = process.argv.slice(2), bucket = questsBucketFromEnv() || (process.env.FF_QUESTS_BUCKET === undefined ? 'quests' : null);
if (bucket !== 'quests' || process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, '') !== 'https://br-wild-surf-b4jds6qu.storage.c-6.us-east-2.aws.neon.tech') throw Error('Refusing publication: storage must target the production main branch quests bucket');
const adapter = await createNeonLooseAdapter(bucket), prefix = questsObjectPrefixFromEnv();
const key = joinObjectKey(prefix, 'catalog.json');
if (prefix !== '') throw Error('Refusing publication: production quest catalog has no object prefix');
const catalog = await adapter.exists(key) ? JSON.parse(Buffer.from(await adapter.read(key))) : { quests: [] };
if (!Array.isArray(catalog.quests)) throw Error('catalog_invalid');
for (const row of JSON.parse(await fs.readFile(path.join(dir, 'plan.json'))).quests) {
  const hits = catalog.quests.filter(x => x?.id === row.id);
  if (hits.length > 1) throw Error(`catalog_id_conflict: ${row.id}`);
  if (!hits.length) continue;
  const raw = await fs.readFile(path.join(dir, row.file));
  const digest = createHash('sha256').update(raw).digest('hex'), old = hits[0];
  let identical = old.storage === 'loose-v2' && old.packageRef?.packageId === 'loose-quest' && old.packageRef?.questId === row.id && old.packageRef?.revision === `sha256:${digest}`;
  if (!identical && old.storage !== 'loose-v2' && typeof old.file === 'string' && !old.file.startsWith('/') && !old.file.split('/').some(p => p === '..' || p === '.')) {
    identical = Buffer.from(await adapter.read(joinObjectKey(prefix, old.file))).equals(raw);
  }
  if (!identical && force !== '1') throw Error(`quest catalog collision: ${row.id}`);
}
JSCOLLISION
  )
  python3 - "$WORK/plan" "$WARMERSUN_DIR" "$FORCE" "$ROOT" <<'PYRELEASE'
import hashlib, importlib.util, json, sys, urllib.request
from pathlib import Path
from urllib.parse import quote
sys.path.insert(0, str(Path(sys.argv[4]) / 'scripts'))
from verify_public_content import matches_public_content
plan_dir, root = map(Path, sys.argv[1:3]); force = sys.argv[3] == '1'
plan = json.loads((plan_dir / 'plan.json').read_text())
spec = importlib.util.spec_from_file_location('live_patch', root / 'scripts/publish-live-patch.py')
helper = importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
cfg = json.loads((root / 'scripts/herenow-sites.json').read_text())
groups = {}
items = [(f"predictions/{b['id']}/{b['sha256']}.json", plan_dir / 'predictions' / b['id'] / (b['sha256'] + '.json'), True) for b in plan['banks']]
items += [(p, plan_dir / p, False) for p in plan['lessonFiles']]
items += [('quests/spotlights/assets/' + plan['packageId'] + '/' + plan['packageRevision'][7:] + '/' + p[len('assets/'):], plan_dir / p, False) for p in plan['assetFiles']]
durable = []
for rel, src, immutable in items:
    parts = Path(rel).parts
    if any(p in ('.', '..') for p in parts) or not src.is_file() or src.is_symlink(): raise SystemExit(f'unsafe overlay: {rel}')
    site, inner = helper.site_for_repo_path(cfg, rel)
    expected_site = 'predictions' if immutable else ('lessons' if rel.startswith('lessons/') else 'quests')
    if site.get('name') != expected_site or not site.get('slug'): raise SystemExit(f'wrong site mapping: {rel}')
    groups.setdefault(expected_site, {'site': site, 'files': {}})['files'][inner] = src
    if immutable:
        dest = root / 'prediction-banks' / Path(*parts[1:])
    elif expected_site == 'lessons':
        dest = root / 'lesson-src' / Path(*parts[1:])
    else:
        dest = root / 'future-forge' / 'quests' / Path(*parts[2:])
    # Every mapped source is retained for future full Site rebuilds.
    is_immutable = immutable or expected_site == 'quests'
    if any(p.is_symlink() for p in (dest, *dest.parents) if p != root.parent): raise SystemExit(f'unsafe durable source path: {dest}')
    if dest.exists() and (not dest.is_file() or (dest.read_bytes() != src.read_bytes() and (is_immutable or not force))):
        raise SystemExit(f'durable source collision: {dest}')
    durable.append((src, dest, is_immutable))
key = helper.load_key()
for group in groups.values():
    site = group['site']
    live = helper.api(key, 'GET', f"{helper.API}/publish/{site['slug']}")
    if not isinstance(live, dict) or not isinstance(live.get('manifest'), list): raise SystemExit('invalid live manifest')
    previous = {r['path']: r for r in live['manifest']}
    for rel, src in group['files'].items():
        old = previous.get(rel); digest = hashlib.sha256(src.read_bytes()).hexdigest()
        if old and old.get('hash') != digest and (site['name'] in ('predictions', 'quests') or not force): raise SystemExit(f'live collision: {site["name"]}/{rel}')
for src, dest, is_immutable in durable:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        with dest.open('xb') as out: out.write(src.read_bytes())
    elif dest.read_bytes() != src.read_bytes() and not is_immutable and force:
        dest.write_bytes(src.read_bytes())
    if dest.read_bytes() != src.read_bytes(): raise SystemExit('durable source readback mismatch')
for group in groups.values():
    if helper.patch_site(key, group['site'], group['files']) != 0: raise SystemExit('live patch failed; deployment may be partial')
for rel, src, _ in items:
    url = 'https://warmersun.com/' + quote(rel, safe='/')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'FutureForge-Quest-Deploy/1.0'}), timeout=30) as res: actual = res.read()
        if not matches_public_content(src.read_bytes(), actual, is_html=rel.endswith('.html')): raise ValueError('published bytes do not match the package')
    except Exception as exc: raise SystemExit(f'HTTP verification failed: {url}: {exc}; deployment may be partial')
    print(f'Verified {url}')
PYRELEASE
  (cd "$FF_REPO" && node "${ENV_FILES[@]}" "$FF_REPO/scripts/publish-loose-quests.mjs" "$WORK/plan")
else
  printf 'Deploying to production with the v1 helper.\n'
  "$WARMERSUN_DIR/scripts/gated-deploy-package.sh" "${ARGS[@]}"
fi
if [[ "$VERSION" == 1 ]]; then
  # Check exact lesson bytes, not merely the lesson hub or a successful HTTP code.
  python3 - "$WORK/meta.json" "$PKG" "$ROOT" <<'PYVERIFY'
import json, sys, urllib.request, zipfile
from pathlib import Path
from urllib.parse import quote
sys.path.insert(0, str(Path(sys.argv[3]) / 'scripts'))
from verify_public_content import matches_public_content
manifest = json.load(open(sys.argv[1], encoding='utf-8'))['manifest']
paths = sorted(p for p in manifest.get('files', {}) if p.startswith('lessons/'))
with zipfile.ZipFile(sys.argv[2]) as archive:
    for path in paths:
        url = 'https://warmersun.com/' + quote(path, safe='/')
        try:
            request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'User-Agent': 'FutureForge-Quest-Deploy/1.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                actual = response.read()
            expected = archive.read(path)
            if not matches_public_content(expected, actual, is_html=path.endswith('.html')):
                raise ValueError('published bytes do not match the package')
        except Exception as exc:
            raise SystemExit(f'Lesson verification failed: {url}: {exc}. Deployment may be partial.')
        print(f'Verified {url}')
print(f'Verified {len(paths)} lesson file(s).')
PYVERIFY
  echo 'Neon upload returned success; exact object/catalog readback was not performed.'
else
  echo 'V2 publisher verified immutable object and catalog readback.'
fi
echo "Production deployment completed: $ID"
