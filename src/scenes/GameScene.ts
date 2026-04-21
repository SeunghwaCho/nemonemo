/**
 * 게임 씬 - 메인 게임플레이
 * Game scene with full nonogram grid rendering and interaction
 */

import { Scene } from './Scene';
import { LevelData, LevelProgress, CellState, GridLayout } from '../types';
import {
  createGrid, checkSolution, getCompletedRows, getCompletedCols,
  calculateStars, serializeGrid, deserializeGrid
} from '../core/NonogramLogic';

interface GameSceneData {
  level: LevelData;
  progress: LevelProgress | null;
  onComplete: (progress: LevelProgress) => void;
  onBack: () => void;
  onSaveProgress: (progress: LevelProgress) => void;
}

const COLORS = {
  bg: '#1a1a2e',
  header: '#16213e',
  cellEmpty: '#ffffff',
  cellFilled: '#2980b9',
  cellMarked: '#95a5a6',
  cellHover: '#aed6f1',
  gridLine: '#bdc3c7',
  gridLineThick: '#7f8c8d',
  clueText: '#ecf0f1',
  clueTextDone: '#27ae60',
  clueHeader: '#0f3460',
  clueHeaderDone: '#1a5c2e',
  accent: '#e94560',
  timerText: '#f39c12',
  button: '#e94560',
  buttonText: '#ffffff',
  dialogBg: 'rgba(0,0,0,0.75)',
  dialogCard: '#16213e',
};

type DragAction = 'fill' | 'unfill' | 'mark' | 'unmark' | null;

export class GameScene extends Scene {
  private level!: LevelData;
  private grid!: CellState[][];
  private layout!: GridLayout;
  private onComplete!: (progress: LevelProgress) => void;
  private onBack!: () => void;
  private onSaveProgress!: (progress: LevelProgress) => void;

  private startTime = 0;
  private elapsed = 0;
  private timerActive = false;
  private isComplete = false;

  private completedRows: boolean[] = [];
  private completedCols: boolean[] = [];

  private dragAction: DragAction = null;
  private lastDragCell: { row: number; col: number } | null = null;
  private isDragging = false;
  private isPointerDown = false;

  private showConfirmDialog = false;
  private confirmDialogType: 'restart' | 'back' = 'restart';
  private confirmYesRect = { x: 0, y: 0, w: 0, h: 0 };
  private confirmNoRect = { x: 0, y: 0, w: 0, h: 0 };

  private backBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private restartBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private pauseBtnRect = { x: 0, y: 0, w: 0, h: 0 };

  private isPaused = false;
  private pauseResumeRect = { x: 0, y: 0, w: 0, h: 0 };
  private pauseMenuRect = { x: 0, y: 0, w: 0, h: 0 };
  private pauseRestartRect = { x: 0, y: 0, w: 0, h: 0 };

  private autoSaveTimer = 0;
  private readonly AUTO_SAVE_INTERVAL = 30;

  private headerH = 60;

  enter(data?: unknown): void {
    const d = data as GameSceneData;
    this.level = d.level;
    this.onComplete = d.onComplete;
    this.onBack = d.onBack;
    this.onSaveProgress = d.onSaveProgress;

    // 저장된 진행 상황 복원 또는 새 그리드
    if (d.progress?.currentGrid) {
      this.grid = deserializeGrid(d.progress.currentGrid);
      this.elapsed = d.progress.bestTime || 0;
    } else {
      this.grid = createGrid(this.level.width, this.level.height);
      this.elapsed = 0;
    }

    this.timerActive = false;
    this.startTime = 0;
    this.isComplete = false;
    this.isPaused = false;
    this.autoSaveTimer = 0;
    this.showConfirmDialog = false;
    this.dragAction = null;
    this.lastDragCell = null;
    this.isDragging = false;

    this.updateCompleted();
    this.calcLayout();
  }

  exit(): void {
    // 진행 상황 저장
    if (!this.isComplete) {
      this.saveCurrentProgress();
    }
  }

  private saveCurrentProgress(): void {
    const progress: LevelProgress = {
      levelId: this.level.id,
      completed: false,
      stars: 0,
      bestTime: this.elapsed,
      currentGrid: serializeGrid(this.grid),
    };
    this.onSaveProgress(progress);
  }

  private updateCompleted(): void {
    this.completedRows = getCompletedRows(this.grid, this.level);
    this.completedCols = getCompletedCols(this.grid, this.level);
  }

  private calcLayout(): void {
    const W = this.width;
    const H = this.height;
    const availW = W - 20;
    const availH = H - this.headerH - 20;

    // 클루 영역 크기 추정
    const maxRowClueLen = Math.max(...this.level.rowClues.map(c => c.length));
    const maxColClueLen = Math.max(...this.level.colClues.map(c => c.length));

    // 셀 크기 계산
    const cellSizeByW = (availW) / (this.level.width + maxRowClueLen * 0.8);
    const cellSizeByH = (availH) / (this.level.height + maxColClueLen * 0.8);
    let cellSize = Math.floor(Math.min(cellSizeByW, cellSizeByH));
    cellSize = Math.max(10, Math.min(40, cellSize));

    const clueColWidth = maxRowClueLen * cellSize * 0.8;
    const clueRowHeight = maxColClueLen * cellSize * 0.8;

    const gridW = this.level.width * cellSize;
    const gridH = this.level.height * cellSize;

    const totalW = clueColWidth + gridW;
    const totalH = clueRowHeight + gridH;

    const startX = (W - totalW) / 2;
    const startY = this.headerH + (H - this.headerH - totalH) / 2;

    this.layout = {
      cellSize,
      startX,
      startY,
      clueColWidth,
      clueRowHeight,
      gridWidth: gridW,
      gridHeight: gridH,
    };
  }

  private getCellFromPos(x: number, y: number): { row: number; col: number } | null {
    const { startX, startY, clueColWidth, clueRowHeight, cellSize } = this.layout;
    const gridX = startX + clueColWidth;
    const gridY = startY + clueRowHeight;

    if (x < gridX || y < gridY) return null;

    const col = Math.floor((x - gridX) / cellSize);
    const row = Math.floor((y - gridY) / cellSize);

    if (col < 0 || col >= this.level.width || row < 0 || row >= this.level.height) return null;
    return { row, col };
  }

  handlePointerDown(x: number, y: number, secondary: boolean): void {
    this.isPointerDown = true;
    this.isDragging = false;

    if (this.showConfirmDialog || this.isComplete || this.isPaused) return;

    const cell = this.getCellFromPos(x, y);
    if (!cell) return;

    // 타이머 시작
    if (!this.timerActive) {
      this.startTime = Date.now() - this.elapsed * 1000;
      this.timerActive = true;
    }

    const current = this.grid[cell.row][cell.col];

    if (secondary) {
      // 우클릭/롱프레스: 마크 토글
      if (current === CellState.Marked) {
        this.dragAction = 'unmark';
        this.grid[cell.row][cell.col] = CellState.Empty;
      } else if (current === CellState.Empty) {
        this.dragAction = 'mark';
        this.grid[cell.row][cell.col] = CellState.Marked;
      } else {
        this.dragAction = null;
      }
    } else {
      // 좌클릭: 채우기/비우기 토글
      if (current === CellState.Filled) {
        this.dragAction = 'unfill';
        this.grid[cell.row][cell.col] = CellState.Empty;
      } else if (current === CellState.Empty) {
        this.dragAction = 'fill';
        this.grid[cell.row][cell.col] = CellState.Filled;
      } else if (current === CellState.Marked) {
        this.dragAction = 'fill';
        this.grid[cell.row][cell.col] = CellState.Filled;
      } else {
        this.dragAction = null;
      }
    }

    this.lastDragCell = cell;
    this.updateCompleted();
    this.checkWin();
  }

  handlePointerMove(x: number, y: number): void {
    if (!this.isPointerDown || this.isComplete || this.showConfirmDialog || this.isPaused) return;
    if (this.dragAction === null) return;

    this.isDragging = true;
    const cell = this.getCellFromPos(x, y);
    if (!cell) return;
    if (this.lastDragCell &&
        cell.row === this.lastDragCell.row &&
        cell.col === this.lastDragCell.col) return;

    const current = this.grid[cell.row][cell.col];
    switch (this.dragAction) {
      case 'fill':
        if (current === CellState.Empty || current === CellState.Marked) {
          this.grid[cell.row][cell.col] = CellState.Filled;
        }
        break;
      case 'unfill':
        if (current === CellState.Filled) {
          this.grid[cell.row][cell.col] = CellState.Empty;
        }
        break;
      case 'mark':
        if (current === CellState.Empty) {
          this.grid[cell.row][cell.col] = CellState.Marked;
        }
        break;
      case 'unmark':
        if (current === CellState.Marked) {
          this.grid[cell.row][cell.col] = CellState.Empty;
        }
        break;
    }

    this.lastDragCell = cell;
    this.updateCompleted();
    this.checkWin();
  }

  handlePointerUp(x: number, y: number): void {
    const wasDragging = this.isDragging;
    this.isPointerDown = false;
    this.isDragging = false;
    this.dragAction = null;
    this.lastDragCell = null;

    // 일시정지 오버레이 버튼 처리
    if (this.isPaused) {
      if (this.hitRect(x, y, this.pauseResumeRect)) {
        this.resume();
      } else if (this.hitRect(x, y, this.pauseMenuRect)) {
        this.isPaused = false;
        this.onBack();
      } else if (this.hitRect(x, y, this.pauseRestartRect)) {
        this.isPaused = false;
        this.grid = createGrid(this.level.width, this.level.height);
        this.elapsed = 0;
        this.timerActive = false;
        this.startTime = 0;
        this.isComplete = false;
        this.updateCompleted();
      }
      return;
    }

    // 다이얼로그 버튼 처리 (탭 확인)
    if (this.showConfirmDialog) {
      this.handleDialogClick(x, y);
      return;
    }

    // 헤더 버튼 처리 (드래그가 아닌 탭일 때만)
    if (!wasDragging) {
      if (this.hitRect(x, y, this.pauseBtnRect)) {
        this.togglePause();
        return;
      }
      if (this.hitRect(x, y, this.backBtnRect)) {
        this.confirmDialogType = 'back';
        this.showConfirmDialog = true;
        return;
      }
      if (this.hitRect(x, y, this.restartBtnRect)) {
        this.confirmDialogType = 'restart';
        this.showConfirmDialog = true;
        return;
      }
    }
  }

  private togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  private pause(): void {
    this.isPaused = true;
    if (this.timerActive) {
      this.elapsed = (Date.now() - this.startTime) / 1000;
      this.timerActive = false;
    }
  }

  private resume(): void {
    this.isPaused = false;
    if (!this.isComplete && this.elapsed > 0) {
      this.startTime = Date.now() - this.elapsed * 1000;
      this.timerActive = true;
    }
  }

  private checkWin(): void {
    if (checkSolution(this.grid, this.level)) {
      this.isComplete = true;
      this.timerActive = false;
      const stars = calculateStars(this.elapsed, this.level);
      const progress: LevelProgress = {
        levelId: this.level.id,
        completed: true,
        stars,
        bestTime: this.elapsed,
      };
      setTimeout(() => {
        this.onComplete(progress);
      }, 800);
    }
  }

  private handleDialogClick(x: number, y: number): void {
    if (this.hitRect(x, y, this.confirmYesRect)) {
      if (this.confirmDialogType === 'restart') {
        this.grid = createGrid(this.level.width, this.level.height);
        this.elapsed = 0;
        this.timerActive = false;
        this.startTime = 0;
        this.isComplete = false;
        this.updateCompleted();
      } else {
        this.onBack();
      }
      this.showConfirmDialog = false;
    } else if (this.hitRect(x, y, this.confirmNoRect)) {
      this.showConfirmDialog = false;
    }
  }

  private hitRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  update(dt: number): void {
    if (this.timerActive && !this.isComplete && !this.isPaused) {
      this.elapsed = (Date.now() - this.startTime) / 1000;

      this.autoSaveTimer += dt;
      if (this.autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
        this.autoSaveTimer = 0;
        this.saveCurrentProgress();
      }
    }

    // 창 크기 변경 감지
    this.calcLayout();
  }

  render(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    // 배경
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // 헤더
    this.renderHeader();

    // 그리드
    this.renderGrid();

    // 완성 오버레이
    if (this.isComplete) {
      this.renderCompleteOverlay();
    }

    // 확인 다이얼로그
    if (this.showConfirmDialog) {
      this.renderConfirmDialog();
    }

    // 일시정지 오버레이
    if (this.isPaused) {
      this.renderPauseOverlay();
    }
  }

  private renderHeader(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.headerH;

    ctx.fillStyle = COLORS.header;
    ctx.fillRect(0, 0, W, H);

    // 뒤로가기 버튼
    const btnW = 70;
    const btnH = 36;
    const margin = 10;
    this.backBtnRect = { x: margin, y: (H - btnH) / 2, w: btnW, h: btnH };
    ctx.fillStyle = COLORS.button;
    this.roundRect(ctx, this.backBtnRect.x, this.backBtnRect.y, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀ 목록', this.backBtnRect.x + btnW / 2, H / 2);

    // 타이머
    ctx.fillStyle = COLORS.timerText;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.formatTime(this.elapsed), W / 2, H / 2);

    // 레벨 정보
    ctx.fillStyle = COLORS.clueText;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.level.emoji} ${this.level.name}`, W / 2, H / 2 + 14);

    // 다시하기 버튼
    const rbtnW = 70;
    this.restartBtnRect = { x: W - margin - rbtnW, y: (H - btnH) / 2, w: rbtnW, h: btnH };
    ctx.fillStyle = '#7f8c8d';
    this.roundRect(ctx, this.restartBtnRect.x, this.restartBtnRect.y, rbtnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 다시', this.restartBtnRect.x + rbtnW / 2, H / 2);

    // 일시정지 버튼 (다시하기 왼쪽)
    const pbtnW = 44;
    const pbtnGap = 6;
    this.pauseBtnRect = {
      x: this.restartBtnRect.x - pbtnGap - pbtnW,
      y: (H - btnH) / 2,
      w: pbtnW,
      h: btnH,
    };
    ctx.fillStyle = '#8e44ad';
    this.roundRect(ctx, this.pauseBtnRect.x, this.pauseBtnRect.y, pbtnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⏸', this.pauseBtnRect.x + pbtnW / 2, H / 2);
  }

  private renderGrid(): void {
    const ctx = this.ctx;
    const { startX, startY, clueColWidth, clueRowHeight, cellSize } = this.layout;
    const gridX = startX + clueColWidth;
    const gridY = startY + clueRowHeight;

    // 행 클루 (왼쪽)
    for (let row = 0; row < this.level.height; row++) {
      const isDone = this.completedRows[row];
      const clue = this.level.rowClues[row];
      const cellY = gridY + row * cellSize;

      ctx.fillStyle = isDone ? COLORS.clueHeaderDone : 'rgba(255,255,255,0.05)';
      ctx.fillRect(startX, cellY, clueColWidth, cellSize);

      ctx.fillStyle = isDone ? COLORS.clueTextDone : COLORS.clueText;
      ctx.font = `bold ${Math.min(cellSize * 0.5, 14)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const clueStr = clue.join(' ');
      ctx.fillText(clueStr, gridX - 4, cellY + cellSize / 2);
    }

    // 열 클루 (위)
    for (let col = 0; col < this.level.width; col++) {
      const isDone = this.completedCols[col];
      const clue = this.level.colClues[col];
      const cellX = gridX + col * cellSize;

      ctx.fillStyle = isDone ? COLORS.clueHeaderDone : 'rgba(255,255,255,0.05)';
      ctx.fillRect(cellX, startY, cellSize, clueRowHeight);

      ctx.fillStyle = isDone ? COLORS.clueTextDone : COLORS.clueText;
      ctx.font = `bold ${Math.min(cellSize * 0.5, 12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const lineH = Math.min(cellSize * 0.6, 14);
      clue.forEach((num, i) => {
        const yPos = startY + clueRowHeight - (clue.length - 1 - i) * lineH - 4;
        ctx.fillText(String(num), cellX + cellSize / 2, yPos);
      });
    }

    // 셀 그리기
    for (let row = 0; row < this.level.height; row++) {
      for (let col = 0; col < this.level.width; col++) {
        const cellX = gridX + col * cellSize;
        const cellY = gridY + row * cellSize;
        const state = this.grid[row][col];

        switch (state) {
          case CellState.Filled:
            ctx.fillStyle = COLORS.cellFilled;
            ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
            break;
          case CellState.Marked:
            ctx.fillStyle = COLORS.cellEmpty;
            ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
            // X 표시
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
            ctx.beginPath();
            ctx.moveTo(cellX + cellSize * 0.25, cellY + cellSize * 0.25);
            ctx.lineTo(cellX + cellSize * 0.75, cellY + cellSize * 0.75);
            ctx.moveTo(cellX + cellSize * 0.75, cellY + cellSize * 0.25);
            ctx.lineTo(cellX + cellSize * 0.25, cellY + cellSize * 0.75);
            ctx.stroke();
            break;
          default:
            ctx.fillStyle = COLORS.cellEmpty;
            ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
            break;
        }
      }
    }

    // 그리드 선
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    // 가로선
    for (let row = 0; row <= this.level.height; row++) {
      const y = gridY + row * cellSize;
      const isThick = row % 5 === 0;
      ctx.strokeStyle = isThick ? COLORS.gridLineThick : COLORS.gridLine;
      ctx.lineWidth = isThick ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(gridX, y);
      ctx.lineTo(gridX + this.layout.gridWidth, y);
      ctx.stroke();
    }

    // 세로선
    for (let col = 0; col <= this.level.width; col++) {
      const x = gridX + col * cellSize;
      const isThick = col % 5 === 0;
      ctx.strokeStyle = isThick ? COLORS.gridLineThick : COLORS.gridLine;
      ctx.lineWidth = isThick ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x, gridY + this.layout.gridHeight);
      ctx.stroke();
    }
  }

  private renderCompleteOverlay(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', W / 2, H / 2);
  }

  private renderPauseOverlay(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const dw = Math.min(300, W * 0.85);
    const dh = 220;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.fillStyle = COLORS.dialogCard;
    this.roundRect(ctx, dx, dy, dw, dh, 16);
    ctx.fill();
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 2;
    this.roundRect(ctx, dx, dy, dw, dh, 16);
    ctx.stroke();

    ctx.fillStyle = COLORS.clueText;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸ 일시정지', W / 2, dy + 44);

    const btnW = dw - 40;
    const btnH = 42;
    const btnX = dx + 20;
    const gap = 10;

    // 이어하기 버튼
    const resumeY = dy + 82;
    this.pauseResumeRect = { x: btnX, y: resumeY, w: btnW, h: btnH };
    ctx.fillStyle = '#27ae60';
    this.roundRect(ctx, btnX, resumeY, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('▶ 이어하기', btnX + btnW / 2, resumeY + btnH / 2);

    // 다시하기 버튼
    const restartY = resumeY + btnH + gap;
    this.pauseRestartRect = { x: btnX, y: restartY, w: btnW / 2 - gap / 2, h: btnH };
    ctx.fillStyle = '#2980b9';
    this.roundRect(ctx, btnX, restartY, btnW / 2 - gap / 2, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('🔄 다시하기', btnX + (btnW / 2 - gap / 2) / 2, restartY + btnH / 2);

    // 목록으로 버튼
    const menuBtnX = btnX + btnW / 2 + gap / 2;
    this.pauseMenuRect = { x: menuBtnX, y: restartY, w: btnW / 2 - gap / 2, h: btnH };
    ctx.fillStyle = COLORS.button;
    this.roundRect(ctx, menuBtnX, restartY, btnW / 2 - gap / 2, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.fillText('📋 목록으로', menuBtnX + (btnW / 2 - gap / 2) / 2, restartY + btnH / 2);
  }

  private renderConfirmDialog(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    // 배경 오버레이
    ctx.fillStyle = COLORS.dialogBg;
    ctx.fillRect(0, 0, W, H);

    // 다이얼로그 박스
    const dw = Math.min(300, W * 0.8);
    const dh = 160;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.fillStyle = COLORS.dialogCard;
    this.roundRect(ctx, dx, dy, dw, dh, 16);
    ctx.fill();

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    this.roundRect(ctx, dx, dy, dw, dh, 16);
    ctx.stroke();

    // 텍스트
    ctx.fillStyle = COLORS.clueText;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const msg = this.confirmDialogType === 'restart'
      ? '처음부터 다시 시작할까요?'
      : '목록으로 돌아갈까요?';
    ctx.fillText(msg, W / 2, dy + 40);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#95a5a6';
    if (this.confirmDialogType === 'restart') {
      ctx.fillText('현재 진행이 초기화됩니다', W / 2, dy + 65);
    }

    // 버튼
    const btnW = 100;
    const btnH = 40;
    const btnY = dy + dh - 55;
    const gapX = 20;

    const yesBtnX = W / 2 - btnW - gapX / 2;
    const noBtnX = W / 2 + gapX / 2;

    this.confirmYesRect = { x: yesBtnX, y: btnY, w: btnW, h: btnH };
    this.confirmNoRect = { x: noBtnX, y: btnY, w: btnW, h: btnH };

    // Yes 버튼
    ctx.fillStyle = COLORS.button;
    this.roundRect(ctx, yesBtnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('확인', yesBtnX + btnW / 2, btnY + btnH / 2);

    // No 버튼
    ctx.fillStyle = '#7f8c8d';
    this.roundRect(ctx, noBtnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.fillText('취소', noBtnX + btnW / 2, btnY + btnH / 2);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

}
