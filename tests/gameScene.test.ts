/**
 * GameScene 버튼 입력 처리 단위 테스트
 *
 * 주요 검증 대상:
 *  - hitRect 경계값
 *  - 버튼 탭이 handlePointerDown(touchstart)에서 더 이상 트리거되지 않음
 *  - 버튼 탭이 handlePointerUp(touchend)에서 올바르게 트리거됨
 *  - 확인 다이얼로그 흐름 (확인 / 취소)
 *  - 셀 드래그 후 버튼 영역 UP → 버튼 미발동
 */

import { GameScene } from '../src/scenes/GameScene';
import { LevelData } from '../src/types';
import { test, describe, expect } from './testRunner';

// ─── 공통 픽스처 ────────────────────────────────────────────────

/** 5×5 테스트 레벨 (rowClues 최대 길이 2, colClues 최대 길이 1) */
const testLevel: LevelData = {
  id: 1, name: '테스트', emoji: '🧩',
  width: 5, height: 5,
  rowClues: [[1, 1], [5], [5], [3], [1]],
  colClues: [[2], [4], [4], [4], [2]],
  solution: [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  difficulty: 'easy',
};

/** 렌더링에 필요한 no-op 캔버스 컨텍스트 모의 */
class FakeCtx {
  fillStyle = '';
  strokeStyle = '';
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  lineWidth = 1;
  fillRect() {}
  fillText() {}
  stroke() {}
  fill() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  arc() {}
  save() {}
  restore() {}
  rect() {}
  clip() {}
  translate() {}
  setTransform() {}
}

/**
 * W=360, H=640 캔버스 기준 레이아웃 좌표 (calcLayout에서 계산한 값)
 *
 * cellSize = 40 (max(10, min(40, floor(min(340/6.6, 560/5.8)))))
 * clueColWidth = 64  (2 * 40 * 0.8)
 * clueRowHeight = 32 (1 * 40 * 0.8)
 * startX = 48        ((360 - 264) / 2)
 * startY = 234       (60 + (640 - 60 - 232) / 2)
 * gridX = 112        (48 + 64)
 * gridY = 266        (234 + 32)
 *
 * 버튼 (renderHeader, headerH=60):
 *   backBtnRect    = { x:10,  y:12, w:70, h:36 }  → 중앙 (45, 30)
 *   restartBtnRect = { x:280, y:12, w:70, h:36 }  → 중앙 (315, 30)
 *
 * 확인 다이얼로그 버튼 (renderConfirmDialog, W=360 H=640):
 *   dw=288, dh=160, dx=36, dy=240, btnY=345
 *   confirmYesRect = { x:70,  y:345, w:100, h:40 } → 중앙 (120, 365)
 *   confirmNoRect  = { x:190, y:345, w:100, h:40 } → 중앙 (240, 365)
 *
 * 셀 (0,0) 중앙: (132, 286)
 */
const W = 360, H = 640;
const BACK_BTN    = { x: 45,  y: 30  };   // 목록 버튼 중앙
const RESTART_BTN = { x: 315, y: 30  };   // 다시하기 버튼 중앙
const CONFIRM_YES = { x: 120, y: 365 };   // 다이얼로그 "확인"
const CONFIRM_NO  = { x: 240, y: 365 };   // 다이얼로그 "취소"
const CELL_0_0    = { x: 132, y: 286 };   // 그리드 첫 번째 셀 중앙

function makeScene(): GameScene {
  const canvas = { clientWidth: W, clientHeight: H } as HTMLCanvasElement;
  const ctx = new FakeCtx() as unknown as CanvasRenderingContext2D;
  return new GameScene(canvas, ctx);
}

interface Callbacks {
  onBack?: () => void;
  onComplete?: (p: unknown) => void;
  onSaveProgress?: (p: unknown) => void;
}

/** 씬 초기화 + 첫 render (button rects 설정) */
function setup(scene: GameScene, cb: Callbacks = {}): void {
  scene.enter({
    level: testLevel,
    progress: null,
    onComplete:      cb.onComplete      ?? (() => {}),
    onBack:          cb.onBack          ?? (() => {}),
    onSaveProgress:  cb.onSaveProgress  ?? (() => {}),
  });
  scene.render(); // backBtnRect, restartBtnRect 설정
}

/** 탭 시뮬레이션: down → up */
function tap(scene: GameScene, x: number, y: number, secondary = false): void {
  scene.handlePointerDown(x, y, secondary);
  scene.handlePointerUp(x, y);
}

// ─── hitRect 경계값 테스트 ───────────────────────────────────────

describe('hitRect 경계값', () => {
  // GameScene.hitRect와 동일한 로직을 로컬에서 재현
  function hitRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  const btn = { x: 10, y: 12, w: 70, h: 36 }; // backBtnRect 실제 값

  test('버튼 중앙 → 히트', () => {
    expect(hitRect(45, 30, btn)).toBeTruthy();
  });
  test('버튼 좌상단 꼭짓점 → 히트', () => {
    expect(hitRect(10, 12, btn)).toBeTruthy();
  });
  test('버튼 우하단 꼭짓점 → 히트', () => {
    expect(hitRect(80, 48, btn)).toBeTruthy();
  });
  test('버튼 좌측 1px 밖 → 미스', () => {
    expect(hitRect(9, 30, btn)).toBeFalsy();
  });
  test('버튼 우측 1px 밖 → 미스', () => {
    expect(hitRect(81, 30, btn)).toBeFalsy();
  });
  test('버튼 위 1px 밖 → 미스', () => {
    expect(hitRect(45, 11, btn)).toBeFalsy();
  });
  test('버튼 아래 1px 밖 → 미스', () => {
    expect(hitRect(45, 49, btn)).toBeFalsy();
  });
  test('초기 미설정 rect (0,0,0,0) → 원점 제외 미스', () => {
    expect(hitRect(1, 1, { x: 0, y: 0, w: 0, h: 0 })).toBeFalsy();
  });
});

// ─── handlePointerDown - 버튼 트리거 없음 ───────────────────────

describe('handlePointerDown - 버튼 영역에서 트리거 없음 (수정된 동작)', () => {
  test('목록 버튼 영역 DOWN만으로 onBack 미호출', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // DOWN only (UP 없음)
    scene.handlePointerDown(BACK_BTN.x, BACK_BTN.y, false);
    // 다이얼로그가 떴다면 "확인" 위치에서 DOWN을 해도 콜백 발생해야 하지만 →
    // DOWN 단계에서는 다이얼로그가 표시되지 않으므로 아무 일도 없어야 함
    scene.handlePointerDown(CONFIRM_YES.x, CONFIRM_YES.y, false);

    expect(backCalled).toBeFalsy();
  });

  test('다시하기 버튼 영역 DOWN만으로 다이얼로그 미표시', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    scene.handlePointerDown(RESTART_BTN.x, RESTART_BTN.y, false);
    scene.handlePointerDown(CONFIRM_YES.x, CONFIRM_YES.y, false);

    expect(backCalled).toBeFalsy();
  });
});

// ─── handlePointerUp - 헤더 버튼 탭 ────────────────────────────

describe('handlePointerUp - 목록 버튼 탭 → 다이얼로그 → 확인', () => {
  test('탭(down+up) → 다이얼로그 render → 확인 탭 → onBack 호출', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // 1. 목록 버튼 탭
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    // 2. render → confirmYesRect / confirmNoRect 설정
    scene.render();
    // 3. "확인" 탭 → onBack 호출
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCalled).toBeTruthy();
  });

  test('UP 좌표가 버튼 밖이면 다이얼로그 미표시', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // UP이 버튼 밖 (200, 300) → 버튼 미발동
    scene.handlePointerDown(BACK_BTN.x, BACK_BTN.y, false);
    scene.handlePointerUp(200, 300);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCalled).toBeFalsy();
  });
});

describe('handlePointerUp - 다시하기 버튼 탭 → 다이얼로그 → 확인', () => {
  test('확인 → 그리드 초기화 (onBack 미호출)', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    tap(scene, RESTART_BTN.x, RESTART_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    // 다시하기는 onBack이 아닌 그리드 초기화 → onBack 미호출
    expect(backCalled).toBeFalsy();
  });

  test('다시하기 후 목록 버튼 탭 → onBack 정상 호출 (다이얼로그 상태 초기화 확인)', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // 다시하기 → 확인
    tap(scene, RESTART_BTN.x, RESTART_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    // 다이얼로그가 닫힌 뒤 목록 버튼 재탭
    scene.render();
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCalled).toBeTruthy();
  });
});

// ─── 확인 다이얼로그 취소 ────────────────────────────────────────

describe('확인 다이얼로그 - 취소 버튼', () => {
  test('"취소" 탭 → onBack 미호출', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_NO.x, CONFIRM_NO.y);

    expect(backCalled).toBeFalsy();
  });

  test('"취소" 후 다시 목록 버튼 탭 → onBack 정상 호출', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // 취소로 다이얼로그 닫기
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_NO.x, CONFIRM_NO.y);
    scene.render();

    // 다시 목록 탭 → 확인
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCalled).toBeTruthy();
  });
});

// ─── 드래그와 버튼 충돌 ─────────────────────────────────────────

describe('드래그 후 버튼 영역 UP → 버튼 미발동', () => {
  test('셀(0,0) 드래그 후 목록 버튼 위치 UP → onBack 미호출', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // 셀 위치에서 DOWN → dragAction 설정
    scene.handlePointerDown(CELL_0_0.x, CELL_0_0.y, false);
    // 이동 → isDragging = true
    scene.handlePointerMove(CELL_0_0.x + 5, CELL_0_0.y + 5);
    // 버튼 위치에서 UP → 드래그 중이므로 버튼 미발동
    scene.handlePointerUp(BACK_BTN.x, BACK_BTN.y);

    expect(backCalled).toBeFalsy();
  });

  test('버튼 DOWN → 약간 이동 → 버튼 UP → 버튼 발동 (헤더 위 이동은 dragAction 없음)', () => {
    const scene = makeScene();
    let backCalled = false;
    setup(scene, { onBack: () => { backCalled = true; } });

    // 버튼 영역에서 DOWN (dragAction = null, 셀 영역이 아님)
    scene.handlePointerDown(BACK_BTN.x, BACK_BTN.y, false);
    // 약간 이동 (dragAction === null 이므로 isDragging이 설정되지 않음)
    scene.handlePointerMove(BACK_BTN.x + 3, BACK_BTN.y + 2);
    // 버튼 UP → 버튼 발동
    scene.handlePointerUp(BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCalled).toBeTruthy();
  });
});

// ─── 다이얼로그 중 셀 조작 차단 ─────────────────────────────────

describe('다이얼로그 표시 중 셀 조작 차단', () => {
  test('다이얼로그 열린 상태에서 셀 DOWN → 드래그 미시작', () => {
    const scene = makeScene();
    let saveProgressCalled = false;
    setup(scene, {
      onSaveProgress: () => { saveProgressCalled = true; },
    });

    // 다이얼로그 열기
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();

    // 다이얼로그 열린 상태에서 셀 영역 DOWN + MOVE
    scene.handlePointerDown(CELL_0_0.x, CELL_0_0.y, false);
    scene.handlePointerMove(CELL_0_0.x + 40, CELL_0_0.y);

    // 크래시 없이 정상 동작해야 함
    expect(saveProgressCalled).toBeFalsy();
  });
});

// ─── 연속 탭 동작 ───────────────────────────────────────────────

describe('연속 탭 - 두 번 onBack 호출 방지', () => {
  test('목록 확인 후 씬 전환되므로 두 번째 탭은 독립 동작', () => {
    const scene = makeScene();
    let backCount = 0;
    setup(scene, { onBack: () => { backCount++; } });

    // 첫 번째 목록 → 확인
    tap(scene, BACK_BTN.x, BACK_BTN.y);
    scene.render();
    tap(scene, CONFIRM_YES.x, CONFIRM_YES.y);

    expect(backCount).toBe(1);
  });
});
