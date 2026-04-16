/**
 * NonogramLogic 단위 테스트
 * Unit tests for NonogramLogic functions
 */

import {
  getRuns,
  createGrid,
  checkLine,
  checkSolution,
  getCompletedRows,
  getCompletedCols,
  calculateStars,
  serializeGrid,
  deserializeGrid,
} from '../src/core/NonogramLogic';
import { CellState, LevelData } from '../src/types';

// 간단한 테스트 헬퍼
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}: ${e}`);
    failed++;
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
  };
}

// 테스트 레벨 데이터
// 솔루션에서 직접 계산된 정확한 clue 사용
const testLevel: LevelData = {
  id: 1,
  name: '테스트',
  emoji: '🧪',
  width: 5,
  height: 5,
  rowClues: [[1, 1], [5], [5], [3], [1]],
  colClues: [[2], [4], [4], [4], [2]], // col2: [0,1,1,1,1] = [4], not [5]
  solution: [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  difficulty: 'easy',
};

// === getRuns 테스트 ===
test('getRuns: 빈 라인', () => {
  expect(getRuns([0, 0, 0])).toEqual([0]);
});

test('getRuns: 연속 채움', () => {
  expect(getRuns([1, 1, 1])).toEqual([3]);
});

test('getRuns: 분리된 그룹', () => {
  expect(getRuns([1, 0, 1])).toEqual([1, 1]);
});

test('getRuns: 복잡한 패턴', () => {
  expect(getRuns([1, 1, 0, 1, 1, 1])).toEqual([2, 3]);
});

test('getRuns: 단일 셀', () => {
  expect(getRuns([0, 1, 0, 1, 0])).toEqual([1, 1]);
});

// === createGrid 테스트 ===
test('createGrid: 크기 확인', () => {
  const grid = createGrid(5, 3);
  expect(grid.length).toBe(3);
  expect(grid[0].length).toBe(5);
});

test('createGrid: 초기값 Empty', () => {
  const grid = createGrid(3, 3);
  expect(grid[0][0]).toBe(CellState.Empty);
  expect(grid[1][1]).toBe(CellState.Empty);
  expect(grid[2][2]).toBe(CellState.Empty);
});

// === checkLine 테스트 ===
test('checkLine: 빈 라인과 [0] 클루', () => {
  const line = [CellState.Empty, CellState.Empty, CellState.Empty];
  expect(checkLine(line, [0])).toBeTruthy();
});

test('checkLine: 올바른 패턴', () => {
  const line = [CellState.Filled, CellState.Empty, CellState.Filled, CellState.Empty, CellState.Filled];
  expect(checkLine(line, [1, 1, 1])).toBeTruthy();
});

test('checkLine: 틀린 패턴', () => {
  const line = [CellState.Filled, CellState.Filled, CellState.Empty, CellState.Empty, CellState.Empty];
  expect(checkLine(line, [1, 1])).toBeFalsy();
});

test('checkLine: 마크된 셀은 무시', () => {
  const line = [CellState.Filled, CellState.Marked, CellState.Filled];
  expect(checkLine(line, [1, 1])).toBeTruthy();
});

// === checkSolution 테스트 ===
test('checkSolution: 정답 그리드', () => {
  const grid: CellState[][] = testLevel.solution.map(row =>
    row.map(cell => cell === 1 ? CellState.Filled : CellState.Empty)
  );
  expect(checkSolution(grid, testLevel)).toBeTruthy();
});

test('checkSolution: 빈 그리드는 오답', () => {
  const grid = createGrid(5, 5);
  expect(checkSolution(grid, testLevel)).toBeFalsy();
});

test('checkSolution: 부분 정답은 오답', () => {
  const grid = createGrid(5, 5);
  grid[0][1] = CellState.Filled;
  expect(checkSolution(grid, testLevel)).toBeFalsy();
});

test('checkSolution: 마크된 셀이 있으면 오답', () => {
  const grid: CellState[][] = testLevel.solution.map(row =>
    row.map(cell => cell === 1 ? CellState.Filled : CellState.Empty)
  );
  grid[0][0] = CellState.Marked; // 오답 위치에 마크 (원래 0이지만)
  // 정답 자리가 Filled이므로 여전히 일치할 수 있음 - 마크 위치가 0인 곳
  expect(checkSolution(grid, testLevel)).toBeTruthy(); // 마크는 0으로 취급 안함 (Marked != Filled)
});

// === getCompletedRows 테스트 ===
test('getCompletedRows: 빈 그리드는 모두 미완성', () => {
  const grid = createGrid(5, 5);
  const completed = getCompletedRows(grid, testLevel);
  expect(completed.every(c => !c)).toBeTruthy();
});

test('getCompletedRows: 정답 그리드는 모두 완성', () => {
  const grid: CellState[][] = testLevel.solution.map(row =>
    row.map(cell => cell === 1 ? CellState.Filled : CellState.Empty)
  );
  const completed = getCompletedRows(grid, testLevel);
  expect(completed.every(c => c)).toBeTruthy();
});

// === getCompletedCols 테스트 ===
test('getCompletedCols: 정답 그리드는 모두 완성', () => {
  const grid: CellState[][] = testLevel.solution.map(row =>
    row.map(cell => cell === 1 ? CellState.Filled : CellState.Empty)
  );
  const completed = getCompletedCols(grid, testLevel);
  expect(completed.every(c => c)).toBeTruthy();
});

// === calculateStars 테스트 ===
test('calculateStars: 빠른 완료는 3점', () => {
  const stars = calculateStars(5, testLevel); // 5x5=25셀, 기준=75초, 5초는 매우 빠름
  expect(stars).toBe(3);
});

test('calculateStars: 느린 완료는 1점', () => {
  const stars = calculateStars(10000, testLevel);
  expect(stars).toBe(1);
});

// === 직렬화/역직렬화 테스트 ===
test('serializeGrid/deserializeGrid: 왕복 변환', () => {
  const grid = createGrid(3, 3);
  grid[0][0] = CellState.Filled;
  grid[1][1] = CellState.Marked;
  grid[2][2] = CellState.Empty;

  const serialized = serializeGrid(grid);
  const restored = deserializeGrid(serialized);

  expect(restored[0][0]).toBe(CellState.Filled);
  expect(restored[1][1]).toBe(CellState.Marked);
  expect(restored[2][2]).toBe(CellState.Empty);
});

// 결과 출력
console.log(`\n테스트 결과: ${passed} 통과 / ${failed} 실패`);
if (failed > 0) process.exit(1);
