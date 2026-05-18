@echo off
cd /d "%TEMP%\errorlens-fix2"
git add src/workflows-page.jsx
git commit -m "Add pagination to Workflows tab to prevent browser freeze on 200+ cards"
git push origin main
