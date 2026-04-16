/**
 * 앱 클래스 - 캔버스 설정, 씬 관리, 게임 루프 (60 FPS)
 * App class: canvas setup, scene management, 60FPS game loop
 */

import { DBManager } from './core/DBManager';
import { LevelLoader } from './core/LevelLoader';
import { InputManager } from './input/InputManager';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { LevelData, LevelProgress } from './types';

type SceneName = 'menu' | 'game' | 'result';

export class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private db: DBManager;
  private levelLoader: LevelLoader;
  private inputManager: InputManager;

  private menuScene: MenuScene;
  private gameScene: GameScene;
  private resultScene: ResultScene;

  private currentSceneName: SceneName = 'menu';
  private lastFrameTime = 0;

  private progressMap: Map<number, LevelProgress> = new Map();

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.db = new DBManager();
    this.levelLoader = new LevelLoader();
    this.inputManager = new InputManager(this.canvas);

    this.menuScene = new MenuScene(this.canvas, this.ctx);
    this.gameScene = new GameScene(this.canvas, this.ctx);
    this.resultScene = new ResultScene(this.canvas, this.ctx);

    this.setupCanvas();
    this.setupInput();
    this.setupResize();
  }

  private setupCanvas(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 물리적 픽셀 해상도 설정
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;

    // CSS 크기 설정
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // DPR 스케일 적용
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // orientation change 지원
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });
  }

  private setupInput(): void {
    this.inputManager.setOnDown((x, y, secondary) => {
      const scene = this.currentSceneName;
      if (scene === 'menu') {
        this.menuScene.handlePointerDown(x, y);
      } else if (scene === 'game') {
        this.gameScene.handlePointerDown(x, y, secondary);
      } else if (scene === 'result') {
        this.resultScene.handlePointerDown(x, y);
      }
    });

    this.inputManager.setOnMove((x, y) => {
      const scene = this.currentSceneName;
      if (scene === 'menu') {
        this.menuScene.handlePointerMove(x, y);
      } else if (scene === 'game') {
        this.gameScene.handlePointerMove(x, y);
      }
    });

    this.inputManager.setOnUp((x, y) => {
      const scene = this.currentSceneName;
      if (scene === 'menu') {
        this.menuScene.handlePointerUp(x, y);
      } else if (scene === 'game') {
        this.gameScene.handlePointerUp();
      }
    });

    this.inputManager.setOnSecondary((x, y) => {
      if (this.currentSceneName === 'game') {
        this.gameScene.handlePointerDown(x, y, true);
      }
    });

    // 스크롤 (마우스 휠)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.currentSceneName === 'menu') {
        this.menuScene.handleScroll(e.deltaY * 0.5);
      }
    }, { passive: false });
  }

  async init(): Promise<void> {
    // DB 초기화 (실패해도 계속)
    await this.db.init();

    // 레벨 로드
    await this.levelLoader.load();

    // 진행 상황 로드
    const allProgress = await this.db.loadAllProgress();
    allProgress.forEach(p => this.progressMap.set(p.levelId, p));

    // 메뉴 씬 시작
    this.showMenu();

    // 게임 루프 시작
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private showMenu(): void {
    const levels = this.levelLoader.getAllLevels();
    this.currentSceneName = 'menu';
    this.menuScene.enter({
      levels,
      progressMap: this.progressMap,
      onSelectLevel: (levelId: number) => this.startLevel(levelId),
    });
  }

  private async startLevel(levelId: number): Promise<void> {
    const level = this.levelLoader.getLevel(levelId);
    if (!level) return;

    const progress = this.progressMap.get(levelId) || null;

    this.currentSceneName = 'game';
    this.menuScene.exit();
    this.gameScene.enter({
      level,
      progress,
      onComplete: (p: LevelProgress) => this.onLevelComplete(level, p),
      onBack: () => {
        this.gameScene.exit();
        this.showMenu();
      },
      onSaveProgress: (p: LevelProgress) => this.saveProgress(p),
    });
  }

  private async onLevelComplete(level: LevelData, progress: LevelProgress): Promise<void> {
    // 기존 최고 기록보다 좋으면 저장
    const existing = this.progressMap.get(level.id);
    if (!existing || !existing.completed || progress.stars > existing.stars ||
        (progress.stars === existing.stars && progress.bestTime < existing.bestTime)) {
      this.progressMap.set(level.id, progress);
      await this.db.saveProgress(progress);
    }

    // 결과 씬으로
    const levels = this.levelLoader.getAllLevels();
    const currentIndex = levels.findIndex(l => l.id === level.id);
    const nextLevel = levels[currentIndex + 1] || null;

    this.currentSceneName = 'result';
    this.gameScene.exit();
    this.resultScene.enter({
      level,
      progress,
      onNext: () => {
        if (nextLevel) {
          this.startLevel(nextLevel.id);
        } else {
          this.showMenu();
        }
      },
      onMenu: () => {
        this.resultScene.exit();
        this.showMenu();
      },
      onReplay: () => {
        this.resultScene.exit();
        this.startLevelFresh(level.id);
      },
    });
  }

  private async startLevelFresh(levelId: number): Promise<void> {
    const level = this.levelLoader.getLevel(levelId);
    if (!level) return;

    // 진행 상황 초기화 (완료 기록은 유지, 현재 그리드만 초기화)
    const existing = this.progressMap.get(levelId);
    const freshProgress = existing
      ? { ...existing, currentGrid: undefined, bestTime: 0 }
      : null;

    this.currentSceneName = 'game';
    this.gameScene.enter({
      level,
      progress: freshProgress,
      onComplete: (p: LevelProgress) => this.onLevelComplete(level, p),
      onBack: () => {
        this.gameScene.exit();
        this.showMenu();
      },
      onSaveProgress: (p: LevelProgress) => this.saveProgress(p),
    });
  }

  private async saveProgress(progress: LevelProgress): Promise<void> {
    const existing = this.progressMap.get(progress.levelId);
    // 완료된 레벨의 진행 상황은 덮어쓰지 않음
    if (existing?.completed) {
      // 현재 그리드만 저장
      const merged = { ...existing, currentGrid: progress.currentGrid };
      this.progressMap.set(progress.levelId, merged);
      await this.db.saveProgress(merged);
    } else {
      this.progressMap.set(progress.levelId, progress);
      await this.db.saveProgress(progress);
    }
  }

  private gameLoop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1); // 최대 100ms delta
    this.lastFrameTime = timestamp;

    // 업데이트
    switch (this.currentSceneName) {
      case 'menu':
        this.menuScene.update(dt);
        break;
      case 'game':
        this.gameScene.update(dt);
        break;
      case 'result':
        this.resultScene.update(dt);
        break;
    }

    // 렌더링
    switch (this.currentSceneName) {
      case 'menu':
        this.menuScene.render();
        break;
      case 'game':
        this.gameScene.render();
        break;
      case 'result':
        this.resultScene.render();
        break;
    }

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}
