@echo off
chcp 949 >nul
echo === 네모네모 로직 빌드 시작 ===

REM 의존성 확인 (node_modules 없거나 esbuild 실행 불가 시 재설치)
set NEED_INSTALL=0
if not exist node_modules set NEED_INSTALL=1
if %NEED_INSTALL%==0 (
    .\node_modules\.bin\esbuild.cmd --version > nul 2>&1
    if errorlevel 1 set NEED_INSTALL=1
)
if %NEED_INSTALL%==1 (
    echo npm 패키지 설치 중...
    npm install
    if errorlevel 1 (
        echo npm install 실패
        pause
        exit /b 1
    )
)

REM 레벨 데이터 생성 (번들에 포함될 data/levels.json 생성)
echo 레벨 데이터 생성 중...
node scripts\generateLevels.js
if errorlevel 1 (
    echo 레벨 생성 실패
    pause
    exit /b 1
)

REM TypeScript 번들 빌드 (levels.json 포함)
echo TypeScript 번들 빌드 중...
.\node_modules\.bin\esbuild.cmd src\main.ts ^
  --bundle ^
  --outfile=dist\dist.js ^
  --target=es2017 ^
  --platform=browser ^
  --minify
if errorlevel 1 (
    echo 빌드 실패
    pause
    exit /b 1
)

echo 빌드 완료: dist\dist.js

REM release 폴더 준비 (index.html + dist.js 만 필요)
echo release 폴더 준비 중...
if exist release rmdir /s /q release
mkdir release
mkdir release\dist

copy index.html release\index.html >nul
copy dist\dist.js release\dist\dist.js >nul

echo.
echo === 빌드 완료 ===
echo 릴리즈 파일:
dir release
dir release\dist
echo.
echo 실행 방법:
echo   cd release
echo   python -m http.server 8001
echo   브라우저에서 http://localhost:8001 접속
pause
