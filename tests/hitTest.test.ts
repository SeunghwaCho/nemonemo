/**
 * 히트 테스트 / 좌표 변환 단위 테스트
 * Tests for coordinate conversion logic used in MenuScene and GameScene
 */

import { test, describe, expect } from './testRunner';
import { MenuScene } from '../src/scenes/MenuScene';
import { CellState, LevelData, LevelProgress } from '../src/types';

// ─── MenuScene 좌표 변환 로직 ────────────────────────────────────

/**
 * MenuScene과 동일한 카드 히트 테스트 로직을 독립적으로 추출
 *   - 카드는 translate(0, -scrollY + HEADER_H) 공간에 그려짐
 *   - 히트 테스트: localY = screenY + scrollY - HEADER_H
 */
const HEADER_H = 80;

interface CardRect { id: number; x: number; y: number; w: number; h: number; }

function getCardAt(cardRects: CardRect[], screenX: number, screenY: number, scrollY: number): number {
  const localY = screenY + scrollY - HEADER_H;
  for (const rect of cardRects) {
    if (screenX >= rect.x && screenX <= rect.x + rect.w &&
        localY >= rect.y && localY <= rect.y + rect.h) {
      return rect.id;
    }
  }
  return -1;
}

/** 카드가 실제 그려지는 스크린 Y 계산 */
function cardScreenY(cardY: number, scrollY: number): number {
  return cardY - scrollY + HEADER_H;
}

describe('MenuScene 카드 히트 테스트 (스크롤 없음)', () => {
  const cards: CardRect[] = [
    { id: 1, x: 10, y: 10, w: 160, h: 110 },
    { id: 2, x: 180, y: 10, w: 160, h: 110 },
    { id: 3, x: 10, y: 130, w: 160, h: 110 },
  ];
  const scrollY = 0;

  test('카드 1 중앙 클릭', () => {
    const screenY = cardScreenY(10, scrollY) + 55; // 카드 중앙
    expect(getCardAt(cards, 90, screenY, scrollY)).toBe(1);
  });

  test('카드 2 중앙 클릭', () => {
    const screenY = cardScreenY(10, scrollY) + 55;
    expect(getCardAt(cards, 260, screenY, scrollY)).toBe(2);
  });

  test('카드 3 중앙 클릭', () => {
    const screenY = cardScreenY(130, scrollY) + 55;
    expect(getCardAt(cards, 90, screenY, scrollY)).toBe(3);
  });

  test('카드 밖 클릭 → -1', () => {
    expect(getCardAt(cards, 5, HEADER_H + 60, scrollY)).toBe(-1);
  });

  test('헤더 영역 클릭 → -1', () => {
    // screenY < HEADER_H → localY < 0 → 카드 y >= 0 이므로 히트 없음
    expect(getCardAt(cards, 90, 40, scrollY)).toBe(-1);
  });

  test('카드 1 좌상단 모서리', () => {
    const screenY = cardScreenY(10, scrollY);
    expect(getCardAt(cards, 10, screenY, scrollY)).toBe(1);
  });

  test('카드 1 우하단 모서리', () => {
    const screenY = cardScreenY(10, scrollY) + 110;
    expect(getCardAt(cards, 170, screenY, scrollY)).toBe(1);
  });

  test('카드 1 우하단 바로 밖 → -1', () => {
    const screenY = cardScreenY(10, scrollY) + 111;
    expect(getCardAt(cards, 171, screenY, scrollY)).toBe(-1);
  });
});

describe('MenuScene 카드 히트 테스트 (스크롤 있음)', () => {
  const cards: CardRect[] = [
    { id: 1, x: 10, y: 10,  w: 160, h: 110 },
    { id: 2, x: 10, y: 130, w: 160, h: 110 },
    { id: 3, x: 10, y: 250, w: 160, h: 110 },
  ];

  test('scrollY=100일 때 카드 2가 헤더 바로 아래 위치', () => {
    const scrollY = 100;
    // 카드2 screen y = 130 - 100 + 80 = 110
    const screenY = cardScreenY(130, scrollY) + 55;
    expect(getCardAt(cards, 90, screenY, scrollY)).toBe(2);
  });

  test('scrollY=100일 때 카드 1은 헤더 위로 올라감', () => {
    const scrollY = 100;
    // 카드1 screen y = 10 - 100 + 80 = -10 (화면 밖)
    const screenY = cardScreenY(10, scrollY) + 55;
    // screenY = 45, 이 위치의 localY = 45 + 100 - 80 = 65 ≠ 카드1.y 범위(10~120)
    // 실제로는 맞을 수도 있으니 올바른 카드만 확인
    const hit = getCardAt(cards, 90, screenY, scrollY);
    // localY=65, 카드1(10~120), 카드2(130~240) → 카드1 히트
    expect(hit).toBe(1);
  });

  test('scrollY=200일 때 카드 3 중앙 클릭', () => {
    const scrollY = 200;
    const screenY = cardScreenY(250, scrollY) + 55; // 250-200+80+55 = 185
    expect(getCardAt(cards, 90, screenY, scrollY)).toBe(3);
  });

  test('scrollY=0과 scrollY=120은 다른 카드를 선택', () => {
    // 화면 y = HEADER_H + 185 (265)
    const screenY = 265;
    const hit0 = getCardAt(cards, 90, screenY, 0);   // localY=265+0-80=185 → 카드2(130~240) → 2
    const hit120 = getCardAt(cards, 90, screenY, 120); // localY=265+120-80=305 → 카드3(250~360) → 3
    expect(hit0).toBe(2);
    expect(hit120).toBe(3);
  });
});

// ─── GameScene 셀 좌표 변환 로직 ────────────────────────────────

interface GridLayout {
  cellSize: number;
  startX: number;
  startY: number;
  clueColWidth: number;
  clueRowHeight: number;
  gridWidth: number;
  gridHeight: number;
}

function getCellFromPos(
  x: number, y: number,
  layout: GridLayout,
  levelWidth: number, levelHeight: number
): { row: number; col: number } | null {
  const { startX, startY, clueColWidth, clueRowHeight, cellSize } = layout;
  const gridX = startX + clueColWidth;
  const gridY = startY + clueRowHeight;
  if (x < gridX || y < gridY) return null;
  const col = Math.floor((x - gridX) / cellSize);
  const row = Math.floor((y - gridY) / cellSize);
  if (col < 0 || col >= levelWidth || row < 0 || row >= levelHeight) return null;
  return { row, col };
}

const layout: GridLayout = {
  cellSize: 30,
  startX: 50,
  startY: 80,
  clueColWidth: 60,  // 2 * 30
  clueRowHeight: 60, // 2 * 30
  gridWidth: 150,    // 5 * 30
  gridHeight: 150,
};
// gridX = 50 + 60 = 110, gridY = 80 + 60 = 140

describe('GameScene 셀 좌표 변환', () => {
  test('(0,0) 셀 좌상단 클릭', () => {
    const cell = getCellFromPos(110, 140, layout, 5, 5);
    expect(cell).toEqual({ row: 0, col: 0 });
  });

  test('(0,0) 셀 우하단 클릭 (30px 경계 미만)', () => {
    const cell = getCellFromPos(139, 169, layout, 5, 5);
    expect(cell).toEqual({ row: 0, col: 0 });
  });

  test('(0,1) 셀 클릭', () => {
    const cell = getCellFromPos(140, 140, layout, 5, 5);
    expect(cell).toEqual({ row: 0, col: 1 });
  });

  test('(1,0) 셀 클릭', () => {
    const cell = getCellFromPos(110, 170, layout, 5, 5);
    expect(cell).toEqual({ row: 1, col: 0 });
  });

  test('(4,4) 마지막 셀 클릭', () => {
    const cell = getCellFromPos(110 + 4 * 30 + 15, 140 + 4 * 30 + 15, layout, 5, 5);
    expect(cell).toEqual({ row: 4, col: 4 });
  });

  test('클루 영역 클릭 → null (그리드 밖)', () => {
    expect(getCellFromPos(100, 140, layout, 5, 5)).toBe(null);
  });

  test('헤더 영역 클릭 → null', () => {
    expect(getCellFromPos(110, 100, layout, 5, 5)).toBe(null);
  });

  test('그리드 우측 밖 클릭 → null', () => {
    expect(getCellFromPos(110 + 150 + 5, 140, layout, 5, 5)).toBe(null);
  });

  test('그리드 하단 밖 클릭 → null', () => {
    expect(getCellFromPos(110, 140 + 150 + 5, layout, 5, 5)).toBe(null);
  });

  test('cellSize 경계: 29px는 같은 셀', () => {
    const a = getCellFromPos(110 + 29, 140, layout, 5, 5);
    expect(a).toEqual({ row: 0, col: 0 });
  });

  test('cellSize 경계: 정확히 30px는 다음 셀', () => {
    const b = getCellFromPos(110 + 30, 140, layout, 5, 5);
    expect(b).toEqual({ row: 0, col: 1 });
  });
});

// ─── InputManager 좌표 변환 (getBoundingClientRect 시뮬레이션) ──

describe('InputManager getCanvasPos 시뮬레이션', () => {
  function getCanvasPos(
    clientX: number, clientY: number,
    rectLeft: number, rectTop: number
  ) {
    return { x: clientX - rectLeft, y: clientY - rectTop };
  }

  test('캔버스가 (0,0)에 있을 때 그대로', () => {
    const pos = getCanvasPos(100, 200, 0, 0);
    expect(pos).toEqual({ x: 100, y: 200 });
  });

  test('캔버스가 오프셋 있는 경우', () => {
    const pos = getCanvasPos(350, 450, 100, 50);
    expect(pos).toEqual({ x: 250, y: 400 });
  });

  test('캔버스 안 좌클릭 → x,y 양수', () => {
    const pos = getCanvasPos(50, 50, 10, 10);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });
});

describe('MenuScene 렌더링 회귀 테스트', () => {
  class FakeCanvasContext {
    fillRectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
    fillStyle = '';
    strokeStyle = '';
    font = '';
    textAlign: CanvasTextAlign = 'start';
    textBaseline: CanvasTextBaseline = 'alphabetic';
    lineWidth = 1;

    fillRect(x: number, y: number, w: number, h: number): void {
      this.fillRectCalls.push({ x, y, w, h });
    }
    save(): void {}
    beginPath(): void {}
    rect(): void {}
    clip(): void {}
    translate(): void {}
    fillText(): void {}
    stroke(): void {}
    restore(): void {}
    moveTo(): void {}
    lineTo(): void {}
    quadraticCurveTo(): void {}
    closePath(): void {}
    fill(): void {}
  }

  const baseLevel: LevelData = {
    id: 1,
    name: '테스트',
    emoji: '🧩',
    width: 5,
    height: 5,
    rowClues: [[1], [1], [1], [1], [1]],
    colClues: [[1], [1], [1], [1], [1]],
    solution: [
      [1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1],
    ],
    difficulty: 'easy',
  };

  function createLevel(id: number): LevelData {
    return {
      ...baseLevel,
      id,
      name: `레벨 ${id}`,
    };
  }

  test('스크롤바가 필요한 메뉴 렌더링은 예외를 던지지 않는다', () => {
    const canvas = {
      clientWidth: 360,
      clientHeight: 280,
    } as HTMLCanvasElement;
    const fakeCtx = new FakeCanvasContext();
    const ctx = fakeCtx as unknown as CanvasRenderingContext2D;
    const scene = new MenuScene(canvas, ctx);
    const levels = Array.from({ length: 12 }, (_, index) => createLevel(index + 1));
    const progressMap = new Map<number, LevelProgress>();

    scene.enter({
      levels,
      progressMap,
      onSelectLevel: () => undefined,
    });

    scene.render();
    const scrollbarRects = fakeCtx.fillRectCalls.filter(({ x, w }) => x === 352 && w === 4);
    expect(scrollbarRects.length).toBe(2);
    expect(scrollbarRects[0]).toEqual({ x: 352, y: 90, w: 4, h: 180 });
    expect(scrollbarRects[1].y).toBeGreaterThanOrEqual(90);
    expect(scrollbarRects[1].h).toBeGreaterThanOrEqual(30);
  });
});
