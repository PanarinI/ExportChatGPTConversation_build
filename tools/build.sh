#!/usr/bin/env bash
# Единственный законный путь в пакет. Два режима — дев на время теста, прод после утверждения:
#
#   bash tools/build.sh dev    → dist/exportgpt-<версия>-dev.zip  + dist/unpacked-<версия>-dev/
#   bash tools/build.sh prod   → dist/exportgpt-<версия>.zip
#
# Дев-пакет несёт `version_name: "<версия>-dev"` — в chrome://extensions видно, что стоит тестовая
# сборка, а не то, что уедет людям. Прод-пакет `version_name` НЕ несёт: в сторе должен стоять чистый
# номер (урок 1.1.4 — `version_name` при заливке снимали руками, теперь это делает режим).
#
# Дев-папка `unpacked-*` — то же дерево, уже разжатое: `load unpacked` берётся ИМЕННО из неё, а не из
# корня репозитория. Так тестируется то, что реально уехало в архив, вместе со всеми исключениями
# (`exclude.txt`) — забытый файл ловится на тесте, а не на людях.
#
# Готовый zip НЕ перезаписывается: версии в dist/ копятся, каждая своя. Нужно пересобрать — `--force`.
set -euo pipefail

MODE="${1:-}"
FORCE="${2:-}"
[ "$MODE" = "dev" ] || [ "$MODE" = "prod" ] || { echo "Как: bash tools/build.sh dev|prod [--force]"; exit 2; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -f manifest.json ] || { echo "нет manifest.json — не корень проекта"; exit 1; }
[ -f exclude.txt ]   || { echo "нет exclude.txt — собирать по чему?"; exit 1; }

VER="$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')"
[ -n "$VER" ] || { echo "не прочитал версию из манифеста"; exit 1; }

if [ "$MODE" = "dev" ]; then
  NAME="exportgpt-${VER}-dev"
else
  NAME="exportgpt-${VER}"
fi
OUT="$ROOT/dist/$NAME.zip"

mkdir -p "$ROOT/dist"
# Дев по природе черновой: пересобирается сколько нужно, терять там нечего.
# Прод — артефакт, который уехал (или уедет) людям: молча его не затираем.
if [ -e "$OUT" ]; then
  if [ "$MODE" = "prod" ] && [ "$FORCE" != "--force" ]; then
    echo "СТОП: dist/$NAME.zip уже есть — это прод-пакет."
    echo "      Прод не перезаписывается молча: подними номер в manifest.json или дай --force."
    exit 1
  fi
  echo "(пересобираю поверх прежнего dist/$NAME.zip)"
fi

STAGE="$(mktemp -d)/pkg"
mkdir -p "$STAGE"
trap 'rm -rf "$(dirname "$STAGE")"' EXIT
rsync -a --exclude-from=exclude.txt ./ "$STAGE/"

# version_name ставим/снимаем ТОЛЬКО в копии — рабочий манифест остаётся чистым
python3 - "$STAGE/manifest.json" "$MODE" "$VER" <<'PY'
import json, sys
path, mode, ver = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(path))
if mode == 'dev':
    out = {}
    for k, v in m.items():           # version_name кладём сразу за version — так его видно глазами
        out[k] = v
        if k == 'version':
            out['version_name'] = f'{ver}-dev'
    m = out
else:
    m.pop('version_name', None)
json.dump(m, open(path, 'w'), ensure_ascii=False, indent=4)
open(path, 'a').write('\n')
PY

# Метка сборки — тоже ТОЛЬКО в копии. Без неё «почему правка не приехала»
# стоит целого прогона экспорта: в chrome://extensions обе дев-сборки выглядят
# одинаково (version_name один и тот же), а отличить их в бою было нечем.
python3 - "$STAGE/shared.js" "$MODE" "$VER" <<'PY'
import io, sys, time
path, mode, ver = sys.argv[1], sys.argv[2], sys.argv[3]
stamp = ver + '-dev · ' + time.strftime('%d.%m %H:%M') if mode == 'dev' else ver
s = io.open(path, encoding='utf-8').read()
old = "gptpdfShared.build = 'source';"
if old not in s:
    sys.exit('СТОП: в shared.js нет метки сборки gptpdfShared.build')
io.open(path, 'w', encoding='utf-8').write(
    s.replace(old, "gptpdfShared.build = '" + stamp + "';"))
PY

# Всё, что манифест обещает, должно доехать: забытый в exclude.txt файл роняет сборку здесь,
# а не тихо ломает расширение у людей.
python3 - "$STAGE" <<'PY'
import json, os, sys
stage = sys.argv[1]
m = json.load(open(os.path.join(stage, 'manifest.json')))
need = [m['background']['service_worker']] if m.get('background') else []
for cs in m.get('content_scripts', []):
    need += cs.get('js', []) + cs.get('css', [])
for group in ('icons',):
    need += list(m.get(group, {}).values())
need += list(m.get('action', {}).get('default_icon', {}).values())
if m.get('default_locale'):
    need.append(os.path.join('_locales', m['default_locale'], 'messages.json'))
missing = [f for f in need if not os.path.exists(os.path.join(stage, f))]
if missing:
    print('СТОП: манифест обещает файлы, которых нет в пакете:')
    for f in missing:
        print('   ', f)
    sys.exit(1)
print(f'манифест сверен: {len(need)} обещанных файла на месте')
PY

# Старый архив УБИРАЕМ: `zip -r` дописывает в существующий, а не заменяет — иначе файл, выпавший
# из пакета между сборками, тихо выживает в нём (поймано 08-10: пустая dist/ дожила до дев-пакета).
rm -f "$OUT"
( cd "$STAGE" && zip -q -r -X "$OUT" . )

if [ "$MODE" = "dev" ]; then
  UNPACKED="$ROOT/dist/unpacked-${VER}-dev"
  rm -rf "$UNPACKED"
  mkdir -p "$UNPACKED"
  rsync -a "$STAGE/" "$UNPACKED/"
fi

FILES="$(unzip -l "$OUT" | tail -1 | awk '{print $2}')"
SIZE="$(du -h "$OUT" | cut -f1)"
VNAME="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version_name"] if "version_name" in json.load(open(sys.argv[1])) else "нет (чистый номер)")' "$STAGE/manifest.json" 2>/dev/null || echo '?')"
echo
echo "собрано: dist/$NAME.zip  ·  $FILES файлов  ·  $SIZE"
echo "версия:  $VER  ·  version_name: $VNAME"
[ "$MODE" = "dev" ] && echo "тест:    load unpacked → dist/unpacked-${VER}-dev/"
[ "$MODE" = "prod" ] && echo "в стор:  этот zip; дев-сборку той же версии людям НЕ отдавать"
exit 0
