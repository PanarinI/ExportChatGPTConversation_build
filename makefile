.PHONY: help dev prod

help:
	cat makefile

# Сборка идёт ТОЛЬКО через tools/build.sh (см. шапку скрипта). Два режима:
#   make dev   → dist/exportgpt-<версия>-dev.zip + dist/unpacked-<версия>-dev/ (load unpacked, тест)
#   make prod  → dist/exportgpt-<версия>.zip (в стор, version_name снят)
# Готовый zip не перезаписывается: bash tools/build.sh dev --force
dev:
	bash tools/build.sh dev

prod:
	bash tools/build.sh prod
