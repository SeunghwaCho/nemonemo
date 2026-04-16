/**
 * NonogramLogic 단위 테스트
 * Unit tests for core puzzle logic
 */

import {
  getRuns, createGrid, checkLine, checkSolution,
  getCompletedRows, getCompletedCols,
  calculateStars, serializeGrid, deserializeGrid,
} from '../src/core/NonogramLogic';
import { CellState, LevelData } from '../src/types';
import { test, describe, expect } from './testRunner';

// ─── 테스트용 레벨 픽스처 ───────────────────────────────────────

/** 5×5 하트 모양 */
const heartLevel: LevelData = {
  id: 1, name: '하트', emoji: '❤️',
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

/** 3×3 단순 크로스 */
const crossLevel: LevelData = {
  id: 2, name: '크로스', emoji: '➕',
  width: 3, height: 3,
  rowClues: [[1], [3], [1]],
  colClues: [[1], [3], [1]],
  solution: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  difficulty: 'easy',
};

/** 전부 빈 레벨 (모든 clue가 [0]) */
const emptyLevel: LevelData = {
  id: 3, name: '빈 퍼즐', emoji: '⬜',
  width: 3, height: 3,
  rowClues: [[0], [0], [0]],
  colClues: [[0], [0], [0]],
  solution: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  difficulty: 'easy',
};

// 정답 그리드를 CellState 배열로 변환하는 헬퍼
function solutionGrid(level: LevelData): CellState[][] {
  return level.solution.map(row =>
    row.map(c => c === 1 ? CellState.Filled : CellState.Empty)
  );
}

// ─── getRuns ────────────────────────────────────────────────────

describe('getRuns', () => {
  test('모두 빈 줄 → [0]', () => {
    expect(getRuns([0, 0, 0])).toEqual([0]);
  });
  test('모두 채워진 줄', () => {
    expect(getRuns([1, 1, 1])).toEqual([3]);
  });
  test('두 그룹', () => {
    expect(getRuns([1, 0, 1])).toEqual([1, 1]);
  });
  test('앞뒤 빈칸 있는 그룹', () => {
    expect(getRuns([0, 1, 1, 0])).toEqual([2]);
  });
  test('세 그룹', () => {
    expect(getRuns([1, 1, 0, 1, 1, 1])).toEqual([2, 3]);
  });
  test('단일 셀 두 개', () => {
    expect(getRuns([0, 1, 0, 1, 0])).toEqual([1, 1]);
  });
  test('길이 1 줄 - 채움', () => {
    expect(getRuns([1])).toEqual([1]);
  });
  test('길이 1 줄 - 빈칸', () => {
    expect(getRuns([0])).toEqual([0]);
  });
  test('끝에서 채워지는 경우', () => {
    expect(getRuns([0, 0, 1])).toEqual([1]);
  });
});

// ─── createGrid ─────────────────────────────────────────────────

describe('createGrid', () => {
  test('행 수 확인', () => {
    expect(createGrid(5, 3).length).toBe(3);
  });
  test('열 수 확인', () => {
    expect(createGrid(5, 3)[0].length).toBe(5);
  });
  test('모든 셀 Empty 초기화', () => {
    const grid = createGrid(4, 4);
    const allEmpty = grid.every(row => row.every(c => c === CellState.Empty));
    expect(allEmpty).toBeTruthy();
  });
  test('1×1 그리드', () => {
    const grid = createGrid(1, 1);
    expect(grid[0][0]).toBe(CellState.Empty);
  });
  test('참조 독립성 - 행이 서로 다른 배열', () => {
    const grid = createGrid(3, 3);
    grid[0][0] = CellState.Filled;
    expect(grid[1][0]).toBe(CellState.Empty);
  });
});

// ─── checkLine ──────────────────────────────────────────────────

describe('checkLine', () => {
  test('빈 줄과 [0] clue 일치', () => {
    expect(checkLine([CellState.Empty, CellState.Empty], [0])).toBeTruthy();
  });
  test('채워진 줄과 [3] clue 일치', () => {
    const line = [CellState.Filled, CellState.Filled, CellState.Filled];
    expect(checkLine(line, [3])).toBeTruthy();
  });
  test('[1,1] clue - 정답', () => {
    const line = [CellState.Filled, CellState.Empty, CellState.Filled];
    expect(checkLine(line, [1, 1])).toBeTruthy();
  });
  test('[2] clue - 오답 (그룹 수 불일치)', () => {
    const line = [CellState.Filled, CellState.Empty, CellState.Filled];
    expect(checkLine(line, [2])).toBeFalsy();
  });
  test('[1,2] clue - 길이 불일치', () => {
    const line = [CellState.Filled, CellState.Empty, CellState.Filled];
    expect(checkLine(line, [1, 2])).toBeFalsy();
  });
  test('Marked 셀은 빈칸으로 취급', () => {
    const line = [CellState.Filled, CellState.Marked, CellState.Filled];
    expect(checkLine(line, [1, 1])).toBeTruthy();
  });
  test('Marked 셀만 있으면 빈 줄로 취급', () => {
    const line = [CellState.Marked, CellState.Marked];
    expect(checkLine(line, [0])).toBeTruthy();
  });
  test('clue [3] - 실제 2개만 채워진 경우', () => {
    const line = [CellState.Filled, CellState.Filled, CellState.Empty];
    expect(checkLine(line, [3])).toBeFalsy();
  });
});

// ─── checkSolution ──────────────────────────────────────────────

describe('checkSolution', () => {
  test('정답 그리드는 true', () => {
    expect(checkSolution(solutionGrid(heartLevel), heartLevel)).toBeTruthy();
  });
  test('빈 그리드는 false', () => {
    expect(checkSolution(createGrid(5, 5), heartLevel)).toBeFalsy();
  });
  test('하나만 틀려도 false', () => {
    const grid = solutionGrid(heartLevel);
    grid[0][0] = CellState.Filled; // 원래 0인 자리 채우기
    expect(checkSolution(grid, heartLevel)).toBeFalsy();
  });
  test('정답 위치에 Marked는 false (Marked ≠ Filled)', () => {
    const grid = solutionGrid(heartLevel);
    grid[1][0] = CellState.Marked; // 원래 Filled인 자리를 Marked로
    expect(checkSolution(grid, heartLevel)).toBeFalsy();
  });
  test('크로스 레벨 정답', () => {
    expect(checkSolution(solutionGrid(crossLevel), crossLevel)).toBeTruthy();
  });
  test('모두 빈 레벨 - 빈 그리드가 정답', () => {
    expect(checkSolution(createGrid(3, 3), emptyLevel)).toBeTruthy();
  });
  test('모두 빈 레벨 - 채운 그리드는 오답', () => {
    const grid = createGrid(3, 3);
    grid[0][0] = CellState.Filled;
    expect(checkSolution(grid, emptyLevel)).toBeFalsy();
  });
});

// ─── getCompletedRows / getCompletedCols ───────────────────────

describe('getCompletedRows', () => {
  test('빈 그리드 - 모두 미완성', () => {
    const done = getCompletedRows(createGrid(5, 5), heartLevel);
    expect(done.every(d => !d)).toBeTruthy();
  });
  test('정답 그리드 - 모두 완성', () => {
    const done = getCompletedRows(solutionGrid(heartLevel), heartLevel);
    expect(done.every(d => d)).toBeTruthy();
  });
  test('1행만 완성', () => {
    const grid = createGrid(5, 5);
    // 2번째 행 clue=[5]: 모두 채우기
    grid[1] = grid[1].map(() => CellState.Filled);
    const done = getCompletedRows(grid, heartLevel);
    expect(done[0]).toBeFalsy();
    expect(done[1]).toBeTruthy();
    expect(done[2]).toBeFalsy();
  });
  test('결과 배열 길이 = 행 수', () => {
    const done = getCompletedRows(createGrid(5, 5), heartLevel);
    expect(done.length).toBe(5);
  });
});

describe('getCompletedCols', () => {
  test('정답 그리드 - 모두 완성', () => {
    const done = getCompletedCols(solutionGrid(heartLevel), heartLevel);
    expect(done.every(d => d)).toBeTruthy();
  });
  test('빈 그리드 - 모두 미완성', () => {
    const done = getCompletedCols(createGrid(5, 5), heartLevel);
    expect(done.every(d => !d)).toBeTruthy();
  });
  test('결과 배열 길이 = 열 수', () => {
    const done = getCompletedCols(createGrid(5, 5), heartLevel);
    expect(done.length).toBe(5);
  });
});

// ─── calculateStars ─────────────────────────────────────────────

describe('calculateStars', () => {
  // heartLevel: 5×5=25셀, baseTime=75초
  test('매우 빠른 완료 → 3점', () => {
    expect(calculateStars(10, heartLevel)).toBe(3);   // 10s < 75*0.5=37.5s
  });
  test('기준 시간 50% 이하 → 3점', () => {
    expect(calculateStars(37, heartLevel)).toBe(3);
  });
  test('기준 시간 50~100% → 2점', () => {
    expect(calculateStars(60, heartLevel)).toBe(2);
  });
  test('기준 시간 초과 → 1점', () => {
    expect(calculateStars(100, heartLevel)).toBe(1);
  });
  test('매우 느린 완료 → 1점', () => {
    expect(calculateStars(99999, heartLevel)).toBe(1);
  });
  test('별점은 항상 1~3', () => {
    const s = calculateStars(50, heartLevel);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(3);
  });
  test('큰 레벨은 기준 시간이 더 길다', () => {
    const bigLevel: LevelData = { ...heartLevel, width: 20, height: 20, solution: Array(20).fill(Array(20).fill(0)) };
    // bigLevel baseTime = 400*3 = 1200s
    expect(calculateStars(100, bigLevel)).toBe(3);   // 100s < 600s
    expect(calculateStars(800, bigLevel)).toBe(2);   // 600 < 800 < 1200
    expect(calculateStars(1500, bigLevel)).toBe(1);
  });
});

// ─── serializeGrid / deserializeGrid ────────────────────────────

describe('serializeGrid / deserializeGrid', () => {
  test('빈 그리드 왕복 변환', () => {
    const grid = createGrid(3, 3);
    expect(deserializeGrid(serializeGrid(grid))).toEqual(grid);
  });
  test('Filled/Marked/Empty 혼합 왕복', () => {
    const grid = createGrid(3, 3);
    grid[0][0] = CellState.Filled;
    grid[0][1] = CellState.Marked;
    grid[1][2] = CellState.Filled;
    const restored = deserializeGrid(serializeGrid(grid));
    expect(restored[0][0]).toBe(CellState.Filled);
    expect(restored[0][1]).toBe(CellState.Marked);
    expect(restored[1][2]).toBe(CellState.Filled);
    expect(restored[2][2]).toBe(CellState.Empty);
  });
  test('serialize 결과가 number[][] 타입', () => {
    const serialized = serializeGrid(createGrid(2, 2));
    const isNumbers = serialized.every(row => row.every(v => typeof v === 'number'));
    expect(isNumbers).toBeTruthy();
  });
  test('정답 그리드 왕복 - 정합성 유지', () => {
    const original = solutionGrid(heartLevel);
    const restored = deserializeGrid(serializeGrid(original));
    expect(checkSolution(restored, heartLevel)).toBeTruthy();
  });
  test('1×1 그리드', () => {
    const grid = [[CellState.Filled]];
    expect(deserializeGrid(serializeGrid(grid))[0][0]).toBe(CellState.Filled);
  });
});
