# 개발 이력

## 2026-04-16 - 최초 구현

### 작업 내용
- 프로젝트 전체 구조 설계 및 구현

### 생성된 파일

#### 핵심 소스
- `src/types.ts`: 공유 타입 정의 (CellState, LevelData, LevelProgress, GridLayout 등)
- `src/main.ts`: 앱 엔트리 포인트
- `src/App.ts`: 앱 클래스 - 캔버스 설정, 씬 관리, 60FPS 게임 루프

#### 코어 모듈
- `src/core/DBManager.ts`: IndexedDB 래퍼 - DB 오류 시에도 게임 동작 보장
- `src/core/LevelLoader.ts`: data/levels.json 로더 - fallback 레벨 포함
- `src/core/NonogramLogic.ts`: 퍼즐 핵심 알고리즘 (getRuns, checkLine, checkSolution, calculateStars 등)

#### 입력 관리
- `src/input/InputManager.ts`: 마우스 + 터치 통합 입력 관리자 (롱프레스 400ms = X 표시)

#### 씬 시스템
- `src/scenes/Scene.ts`: 씬 추상 기반 클래스
- `src/scenes/MenuScene.ts`: 레벨 선택 화면 (스크롤, 별점 표시, 진행 상황 표시)
- `src/scenes/GameScene.ts`: 메인 게임플레이 (그리드 렌더링, 드래그, 타이머, 확인 다이얼로그)
- `src/scenes/ResultScene.ts`: 완성 결과 화면 (별점 애니메이션, 다음/다시/목록 버튼)

#### 스크립트 및 설정
- `scripts/generateLevels.js`: 100개 레벨 데이터 생성 스크립트
- `index.html`: 메인 HTML (모바일 최적화, DPR 지원)
- `package.json`: 프로젝트 설정 (typescript, esbuild, ts-node)
- `tsconfig.json`: TypeScript 설정
- `build.sh`: Linux 빌드 스크립트
- `build.bat`: Windows 빌드 스크립트 (cp949 한글 인코딩)

#### 문서
- `README.md`: 한글 readme
- `tests/nonogram.test.ts`: 단위 테스트 (getRuns, checkLine, checkSolution 등)

### 게임 기능
- 100개 레벨: 쉬움 20개(5×5), 보통 30개(10×10), 어려움 30개(15×15), 전문가 20개(20×20)
- 셀 상태: 빈칸, 채움(좌클릭), X표시(우클릭/롱프레스)
- 드래그로 여러 셀 동시 채우기/지우기
- 행/열 완성 시 초록색 하이라이트
- 5칸 단위 두꺼운 그리드 선
- 타이머 (첫 조작 시 시작)
- 완료 시 별점 (1~3점, 완료 시간 기반)
- IndexedDB 진행 상황 자동 저장 및 이어하기
- Canvas 기반 확인 다이얼로그 (브라우저 dialog 미사용)
- 고DPR(devicePixelRatio) 지원
- 모바일 터치 UI 지원
