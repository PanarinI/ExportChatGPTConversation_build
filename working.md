cd /Users/igor/PycharmProjects/save-chatgpt-as-pdf

# make sure you're on main and it's clean
git checkout main

# branch for inline expansion (stars appear inside the button)
git checkout -b rate-us-inline

# go back to main, then branch for the dropdown/below option
git checkout main
git checkout -b rate-us-dropdown


cd /Users/igor/PycharmProjects/save-chatgpt-as-pdf

git add -A
git commit -m "v1.05: star rating, feedback form, themes, TOC, welcome page"
git tag v1.05
git push origin master --tags

git remote add origin https://github.com/PanarinI/ExportChatGPTConversation_build.git
git branch -M main
git push -u origin main

исправление url:
git remote set-url origin https://github.com/PanarinI/ExportChatGPTConversation_build.git

# 1. Убедиться, что ты на dev и он свежий
git checkout dev
git pull origin dev

# 2. Создать ветку под конкретную фичу
git checkout -b feature/my-new-thing

# 3. Работаешь, коммитишь как обычно
git add .
git commit -m "добавил новую штуку"

# 4. Пушишь фича-ветку
git push -u origin feature/my-new-thing

# 5. Открываешь PR: feature/my-new-thing → dev
# Это через GitHub UI или gh cli

# 6. Тестируешь на dev-окружении

# 7. Когда всё ок — открываешь PR: dev → main


cd /Users/igor/PycharmProjects/save-chatgpt-as-pdf

# make sure you're on main and it's clean
git checkout main

# branch for inline expansion (stars appear inside the button)
git checkout -b rate-us-inline

# go back to main, then branch for the dropdown/below option
git checkout main
git checkout -b rate-us-dropdown

 git branch -m rate-us-dropdown rate-us-inline 
 rate-us-inline
 
git branch -m rate-us-temp rate-us-dropdown





Структура веток:
main        ← только стабильные релизы (то что идёт в Chrome Store)
dev         ← рабочая интеграция, здесь всё собирается
feature/*   ← отдельные фичи, от dev
Жизненный цикл фичи:
dev → feature/rate-us-inline → (готово) → merge в dev → (протестировал) → merge в main

Три команды которые ты будешь использовать постоянно:
Начать фичу:
git checkout dev
git checkout -b feature/моя-фича
Завершить фичу:
git checkout dev
git merge feature/моя-фича
git branch -d feature/моя-фича
Выпустить релиз:
git checkout main
git merge dev
git tag v1.06
git push origin main --tags