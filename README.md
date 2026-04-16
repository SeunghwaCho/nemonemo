# 🧩 네모네모 로직

HTML5 Canvas + TypeScript로 만든 2D 네모네모 로직(노노그램) 웹 게임입니다.

## 게임 소개

네모네모 로직은 행과 열의 숫자 힌트를 보고 격자를 채워 그림을 완성하는 퍼즐 게임입니다.

- 숫자는 해당 행/열에서 연속으로 채워진 칸의 개수를 나타냅니다
- 여러 숫자가 있을 경우, 각 그룹 사이에 최소 1칸 이상 비워야 합니다

## 특징

- 100개 레벨 (쉬움 20개, 보통 30개, 어려움 30개, 전문가 20개)
- PC + 모바일 터치 UI 지원
- Samsung Galaxy Z Fold 7 펼침/접힘 화면 지원
- 고해상도(DPR) 지원
- IndexedDB를 이용한 진행 상황 자동 저장
- 이어하기 지원
- 별점 평가 시스템 (완료 시간 기반)

## 조작법

| 조작 | PC | 모바일 |
|------|-----|--------|
| 칸 채우기 | 좌클릭 | 탭 |
| X 표시 | 우클릭 | 롱프레스 (0.4초) |
| 드래그 채우기 | 드래그 | 스와이프 |

## 실행 방법

```bash
# 의존성 설치
npm install

# 레벨 데이터 생성
node scripts/generateLevels.js

# 빌드
npm run build

# 실행 (release 폴더에서)
cd release
python3 -m http.server 8001
# 브라우저에서 http://localhost:8001 접속
```

## 빌드 방법

### Linux/Mac
```bash
bash build.sh
```

### Windows
```cmd
build.bat
```

## 프로젝트 구조

```
nemonemo/
├── src/
│   ├── main.ts           # 엔트리 포인트
│   ├── App.ts            # 앱 클래스 (씬 관리, 게임 루프)
│   ├── types.ts          # 공유 타입 정의
│   ├── core/
│   │   ├── DBManager.ts      # IndexedDB 래퍼
│   │   ├── LevelLoader.ts    # 레벨 데이터 로더
│   │   └── NonogramLogic.ts  # 퍼즐 핵심 알고리즘
│   ├── input/
│   │   └── InputManager.ts   # 마우스+터치 입력 관리
│   └── scenes/
│       ├── Scene.ts          # 씬 기반 클래스
│       ├── MenuScene.ts      # 레벨 선택 화면
│       ├── GameScene.ts      # 게임플레이 화면
│       └── ResultScene.ts    # 완성 결과 화면
├── data/
│   └── levels.json       # 레벨 데이터 (자동 생성)
├── scripts/
│   └── generateLevels.js # 레벨 데이터 생성 스크립트
├── tests/
│   └── nonogram.test.ts  # 단위 테스트
├── dist/
│   └── dist.js           # 빌드 산출물
├── release/              # 배포용 파일 (빌드 후 생성)
├── assets/               # 이미지, 사운드 리소스
├── index.html            # 메인 HTML
├── build.sh              # Linux 빌드 스크립트
├── build.bat             # Windows 빌드 스크립트
└── package.json          # 프로젝트 설정
```

## 기술 스택

- **언어**: TypeScript
- **렌더링**: HTML5 Canvas
- **번들러**: esbuild
- **저장소**: IndexedDB
- **외부 라이브러리**: 없음 (런타임)

## 레벨 추가 방법

`data/levels.json` 파일에 다음 형식으로 추가하세요:

```json
{
  "id": 101,
  "name": "레벨 이름",
  "emoji": "🎯",
  "width": 5,
  "height": 5,
  "rowClues": [[1,1], [5], [5], [3], [1]],
  "colClues": [[2], [4], [5], [4], [2]],
  "solution": [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
  ],
  "difficulty": "easy"
}
```

또는 `scripts/generateLevels.js`를 수정 후 `node scripts/generateLevels.js`를 실행하세요.

## 라이센스

MIT License
