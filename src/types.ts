/**
 * 공유 타입 정의
 * Shared type definitions for the Nonogram game
 */

export enum CellState {
  Empty = 0,
  Filled = 1,
  Marked = 2, // X 표시
}

export interface LevelData {
  id: number;
  name: string;
  emoji: string;
  width: number;
  height: number;
  rowClues: number[][];
  colClues: number[][];
  solution: number[][];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  stars: number; // 1-3
  bestTime: number; // seconds
  currentGrid?: number[][]; // 진행 중 상태 저장
  startTime?: number;
}

export interface GridLayout {
  cellSize: number;
  startX: number;
  startY: number;
  clueColWidth: number;
  clueRowHeight: number;
  gridWidth: number;
  gridHeight: number;
}

export interface InputEvent {
  x: number;
  y: number;
  type: 'down' | 'move' | 'up' | 'secondary'; // secondary = 우클릭/롱프레스
}

export interface SceneTransition {
  to: string;
  data?: unknown;
}
