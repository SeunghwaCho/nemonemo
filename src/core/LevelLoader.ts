/**
 * 레벨 데이터 로더
 * Loads level data from data/levels.json
 */

import { LevelData } from '../types';

export class LevelLoader {
  private levels: LevelData[] = [];
  private loaded = false;

  async load(url = 'data/levels.json'): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.levels = Array.isArray(data) ? data : [];
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load levels:', e);
      // 기본 레벨 하나를 fallback으로 제공
      this.levels = this.getFallbackLevels();
      this.loaded = true;
    }
  }

  getLevel(id: number): LevelData | null {
    return this.levels.find(l => l.id === id) || null;
  }

  getAllLevels(): LevelData[] {
    return this.levels;
  }

  getLevelCount(): number {
    return this.levels.length;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  private getFallbackLevels(): LevelData[] {
    // 기본 5x5 하트 퍼즐
    const solution = [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ];
    return [{
      id: 1,
      name: '하트',
      emoji: '❤️',
      width: 5,
      height: 5,
      rowClues: [[1, 1], [5], [5], [3], [1]],
      colClues: [[2], [4], [5], [4], [2]],
      solution,
      difficulty: 'easy',
    }];
  }
}
