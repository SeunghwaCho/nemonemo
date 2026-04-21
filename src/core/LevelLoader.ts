/**
 * 레벨 데이터 로더
 * Loads level data bundled at build time
 */

import { LevelData } from '../types';
import levelsData from '../../data/levels.json';

export class LevelLoader {
  private levels: LevelData[] = [];
  private loaded = false;

  async load(): Promise<void> {
    try {
      this.levels = Array.isArray(levelsData) ? (levelsData as LevelData[]) : [];
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load levels:', e);
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
