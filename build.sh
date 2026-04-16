#!/bin/bash
# 네모네모 로직 빌드 스크립트 (Linux/Mac)
# Nonogram game build script

set -e

echo "=== 네모네모 로직 빌드 시작 ==="

# 의존성 확인
if [ ! -d "node_modules" ]; then
  echo "npm 패키지 설치 중..."
  npm install
fi

# 레벨 데이터 생성
echo "레벨 데이터 생성 중..."
node scripts/generateLevels.js

# TypeScript 번들 빌드
echo "TypeScript 번들 빌드 중..."
./node_modules/.bin/esbuild src/main.ts \
  --bundle \
  --outfile=dist/dist.js \
  --target=es2017 \
  --platform=browser \
  --minify

echo "빌드 완료: dist/dist.js"

# release 폴더 준비
echo "release 폴더 준비 중..."
rm -rf release
mkdir -p release/data
mkdir -p release/dist
mkdir -p release/assets

# 필요한 파일만 복사
cp index.html release/
cp dist/dist.js release/dist/
cp data/levels.json release/data/

# assets 폴더가 있으면 복사
if [ -d "assets" ] && [ "$(ls -A assets 2>/dev/null)" ]; then
  cp -r assets/* release/assets/ 2>/dev/null || true
fi

echo ""
echo "=== 빌드 완료 ==="
echo "릴리즈 파일:"
ls -la release/
echo ""
echo "실행 방법:"
echo "  cd release && python3 -m http.server 8001"
echo "  브라우저에서 http://localhost:8001 접속"
