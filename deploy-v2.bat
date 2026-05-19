@echo off
setlocal
set GIT="C:\Program Files\Git\cmd\git.exe"
set SRC=C:\Users\ahmad\Modern Amenities\Error Dashboard\errorlens-v2-files
set DST=C:\Users\ahmad\Desktop\el-deploy-temp

cd /d "%DST%"
echo === git pull first ===
%GIT% pull --rebase origin main

echo === copying v2 files in ===
xcopy /S /Y /I "%SRC%\api"       "%DST%\api\"
xcopy /S /Y /I "%SRC%\src"       "%DST%\src\"
xcopy /S /Y /I "%SRC%\sql"       "%DST%\sql\"
xcopy /S /Y /I "%SRC%\templates" "%DST%\templates\"
xcopy /S /Y /I "%SRC%\.github"   "%DST%\.github\"
copy /Y "%SRC%\index.html" "%DST%\index.html"

echo === git status ===
%GIT% status --short

echo === git add ===
%GIT% add -A

echo === git commit ===
%GIT% commit -m "feat-v2-critical-gaps-intelligence-ops"

echo === git push ===
%GIT% push origin main

echo === done ===
endlocal
