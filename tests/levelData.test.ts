/**
 * 레벨 데이터 무결성 테스트
 * Validates all 100 levels in levels.json for structural correctness
 */

import * as fs from 'fs';
import * as path from 'path';
import { test, describe, expect } from './testRunner';

// ─── levels.json 로드 ────────────────────────────────────────────

const levelsPath = path.join(__dirname, '../data/levels.json');
const levels: any[] = JSON.parse(fs.readFileSync(levelsPath, 'utf-8'));

// ─── clue 계산 함수 (generateLevels.js와 동일) ──────────────────

function computeClue(line: number[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else if (count > 0) {
      clues.push(count);
      count = 0;
    }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}

// ─── 구조 검사 ───────────────────────────────────────────────────

describe('levels.json 구조 검사', () => {
  test('100개 레벨 존재', () => {
    expect(levels.length).toBe(100);
  });

  test('id가 1~100 순서대로 존재', () => {
    const ids = levels.map((l: any) => l.id);
    const expected = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(ids).toEqual(expected);
  });

  test('모든 레벨에 필수 필드 존재', () => {
    const required = ['id', 'name', 'emoji', 'width', 'height', 'rowClues', 'colClues', 'solution', 'difficulty'];
    const missing = levels.filter((l: any) =>
      required.some(field => !(field in l))
    );
    expect(missing.length).toBe(0);
  });

  test('difficulty 값이 유효한 범위', () => {
    const valid = new Set(['easy', 'medium', 'hard', 'expert']);
    const invalid = levels.filter((l: any) => !valid.has(l.difficulty));
    expect(invalid.length).toBe(0);
  });

  test('레벨 크기 분포 확인 (5x5, 10x10, 15x15, 20x20)', () => {
    const count5  = levels.filter((l: any) => l.width === 5).length;
    const count10 = levels.filter((l: any) => l.width === 10).length;
    const count15 = levels.filter((l: any) => l.width === 15).length;
    const count20 = levels.filter((l: any) => l.width === 20).length;
    expect(count5).toBe(20);
    expect(count10).toBe(30);
    expect(count15).toBe(30);
    expect(count20).toBe(20);
  });
});

// ─── 개별 레벨 정합성 검사 ───────────────────────────────────────

describe('레벨별 데이터 정합성', () => {
  test('solution 행 수 = height', () => {
    const bad = levels.filter((l: any) => l.solution.length !== l.height);
    expect(bad.length).toBe(0);
  });

  test('solution 열 수 = width (모든 행)', () => {
    const bad = levels.filter((l: any) =>
      l.solution.some((row: number[]) => row.length !== l.width)
    );
    expect(bad.length).toBe(0);
  });

  test('rowClues 배열 길이 = height', () => {
    const bad = levels.filter((l: any) => l.rowClues.length !== l.height);
    expect(bad.length).toBe(0);
  });

  test('colClues 배열 길이 = width', () => {
    const bad = levels.filter((l: any) => l.colClues.length !== l.width);
    expect(bad.length).toBe(0);
  });

  test('solution 셀 값은 0 또는 1만 존재', () => {
    const bad = levels.filter((l: any) =>
      l.solution.some((row: number[]) =>
        row.some((c: number) => c !== 0 && c !== 1)
      )
    );
    expect(bad.length).toBe(0);
  });

  test('rowClues가 solution에서 계산한 clue와 일치', () => {
    const mismatched: number[] = [];
    for (const level of levels) {
      for (let r = 0; r < level.height; r++) {
        const expected = computeClue(level.solution[r]);
        if (JSON.stringify(expected) !== JSON.stringify(level.rowClues[r])) {
          mismatched.push(level.id);
          break;
        }
      }
    }
    if (mismatched.length > 0) {
      throw new Error(`rowClues 불일치 레벨 id: ${mismatched.join(', ')}`);
    }
    expect(mismatched.length).toBe(0);
  });

  test('colClues가 solution에서 계산한 clue와 일치', () => {
    const mismatched: number[] = [];
    for (const level of levels) {
      for (let c = 0; c < level.width; c++) {
        const col = level.solution.map((row: number[]) => row[c]);
        const expected = computeClue(col);
        if (JSON.stringify(expected) !== JSON.stringify(level.colClues[c])) {
          mismatched.push(level.id);
          break;
        }
      }
    }
    if (mismatched.length > 0) {
      throw new Error(`colClues 불일치 레벨 id: ${mismatched.join(', ')}`);
    }
    expect(mismatched.length).toBe(0);
  });

  test('모든 레벨에 name과 emoji가 비어있지 않음', () => {
    const bad = levels.filter((l: any) => !l.name || !l.emoji);
    expect(bad.length).toBe(0);
  });
});

// ─── 게임 플레이 가능성 검사 ────────────────────────────────────

describe('레벨 플레이어빌리티', () => {
  test('모든 레벨에 적어도 한 개의 채워진 셀 존재', () => {
    const allEmpty = levels.filter((l: any) =>
      l.solution.every((row: number[]) => row.every((c: number) => c === 0))
    );
    // 완전히 빈 퍼즐은 없어야 함
    expect(allEmpty.length).toBe(0);
  });

  test('rowClue 합계와 colClue 합계가 일치', () => {
    const mismatched: number[] = [];
    for (const level of levels) {
      const rowSum = level.rowClues.reduce((s: number, clue: number[]) =>
        s + clue.reduce((a: number, b: number) => a + (b === 0 ? 0 : b), 0), 0
      );
      const colSum = level.colClues.reduce((s: number, clue: number[]) =>
        s + clue.reduce((a: number, b: number) => a + (b === 0 ? 0 : b), 0), 0
      );
      if (rowSum !== colSum) mismatched.push(level.id);
    }
    if (mismatched.length > 0) {
      throw new Error(`행/열 clue 합계 불일치 레벨 id: ${mismatched.join(', ')}`);
    }
    expect(mismatched.length).toBe(0);
  });

  test('각 rowClue의 최소 필요 너비 ≤ level.width', () => {
    const bad: number[] = [];
    for (const level of levels) {
      for (const clue of level.rowClues) {
        const minWidth = clue.reduce((a: number, b: number) => a + b, 0) + (clue.length - 1);
        if (minWidth > level.width) { bad.push(level.id); break; }
      }
    }
    if (bad.length > 0) throw new Error(`너비 초과 레벨: ${bad.join(', ')}`);
    expect(bad.length).toBe(0);
  });

  test('각 colClue의 최소 필요 높이 ≤ level.height', () => {
    const bad: number[] = [];
    for (const level of levels) {
      for (const clue of level.colClues) {
        const minHeight = clue.reduce((a: number, b: number) => a + b, 0) + (clue.length - 1);
        if (minHeight > level.height) { bad.push(level.id); break; }
      }
    }
    if (bad.length > 0) throw new Error(`높이 초과 레벨: ${bad.join(', ')}`);
    expect(bad.length).toBe(0);
  });
});
