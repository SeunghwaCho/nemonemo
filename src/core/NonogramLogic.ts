/**
 * 네모네모 로직 핵심 알고리즘
 * Core Nonogram puzzle logic
 */

import { CellState, LevelData } from '../types';

/**
 * 연속된 채워진 셀의 길이 배열 계산 (clue 생성용)
 * Computes runs of filled cells in a line
 */
export function getRuns(line: number[]): number[] {
  const runs: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else {
      if (count > 0) {
        runs.push(count);
        count = 0;
      }
    }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

/**
 * 빈 그리드 생성
 * Creates an empty grid
 */
export function createGrid(width: number, height: number): CellState[][] {
  return Array.from({ length: height }, () =>
    Array(width).fill(CellState.Empty)
  );
}

/**
 * 그리드를 숫자 배열로 변환 (솔루션 비교용)
 */
function gridToNumbers(grid: CellState[][]): number[][] {
  return grid.map(row => row.map(cell => cell === CellState.Filled ? 1 : 0));
}

/**
 * 현재 그리드에서 해당 행의 run이 정답과 일치하는지 확인
 * Checks if a line's current state matches the clue
 */
export function checkLine(line: CellState[], clue: number[]): boolean {
  const nums = line.map(c => c === CellState.Filled ? 1 : 0);
  const runs = getRuns(nums);
  if (clue.length === 1 && clue[0] === 0) {
    return runs.length === 1 && runs[0] === 0;
  }
  if (runs.length !== clue.length) return false;
  return runs.every((r, i) => r === clue[i]);
}

/**
 * 완성된 행 인덱스 목록 반환
 */
export function getCompletedRows(grid: CellState[][], level: LevelData): boolean[] {
  return grid.map((row, i) => checkLine(row, level.rowClues[i]));
}

/**
 * 완성된 열 인덱스 목록 반환
 */
export function getCompletedCols(grid: CellState[][], level: LevelData): boolean[] {
  const completedCols: boolean[] = [];
  for (let col = 0; col < level.width; col++) {
    const colLine = grid.map(row => row[col]);
    completedCols.push(checkLine(colLine, level.colClues[col]));
  }
  return completedCols;
}

/**
 * 솔루션 체크 - 현재 그리드가 정답인지 확인
 * Checks if the current grid matches the solution
 */
export function checkSolution(grid: CellState[][], level: LevelData): boolean {
  const nums = gridToNumbers(grid);
  for (let row = 0; row < level.height; row++) {
    for (let col = 0; col < level.width; col++) {
      if (nums[row][col] !== level.solution[row][col]) return false;
    }
  }
  return true;
}

/**
 * 완료 시간을 기반으로 별점 계산
 * Calculates star rating based on completion time
 */
export function calculateStars(elapsedSeconds: number, level: LevelData): number {
  const cells = level.width * level.height;
  // 난이도에 따른 기준 시간 (초)
  const baseTime = cells * 3; // 셀당 3초 기준

  if (elapsedSeconds <= baseTime * 0.5) return 3;
  if (elapsedSeconds <= baseTime * 1.0) return 2;
  return 1;
}

/**
 * 그리드 상태를 숫자 배열로 직렬화 (저장용)
 */
export function serializeGrid(grid: CellState[][]): number[][] {
  return grid.map(row => row.map(cell => cell as number));
}

/**
 * 숫자 배열을 그리드 상태로 역직렬화 (로드용)
 */
export function deserializeGrid(data: number[][]): CellState[][] {
  return data.map(row => row.map(cell => cell as CellState));
}
