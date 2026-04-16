/**
 * 결과 씬 - 퍼즐 완성 화면
 * Result scene shown after puzzle completion
 */

import { Scene } from './Scene';
import { LevelData, LevelProgress } from '../types';

interface ResultSceneData {
  level: LevelData;
  progress: LevelProgress;
  onNext: () => void;
  onMenu: () => void;
  onReplay: () => void;
}

const COLORS = {
  bg: '#1a1a2e',
  card: '#16213e',
  text: '#ecf0f1',
  subText: '#95a5a6',
  star: '#f39c12',
  starEmpty: '#4a4a6a',
  button: '#e94560',
  buttonText: '#ffffff',
  nextBtn: '#27ae60',
  accent: '#2980b9',
};

export class ResultScene extends Scene {
  private level!: LevelData;
  private progress!: LevelProgress;
  private onNext!: () => void;
  private onMenu!: () => void;
  private onReplay!: () => void;

  private menuBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private replayBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private nextBtnRect = { x: 0, y: 0, w: 0, h: 0 };

  private animTimer = 0;
  private starReveal = 0; // 0-3, 별 등장 애니메이션

  enter(data?: unknown): void {
    const d = data as ResultSceneData;
    this.level = d.level;
    this.progress = d.progress;
    this.onNext = d.onNext;
    this.onMenu = d.onMenu;
    this.onReplay = d.onReplay;
    this.animTimer = 0;
    this.starReveal = 0;
  }

  exit(): void {}

  update(dt: number): void {
    this.animTimer += dt;
    // 별 등장 애니메이션: 0.3초마다 하나씩
    this.starReveal = Math.min(this.progress.stars, Math.floor(this.animTimer / 0.3));
  }

  handlePointerDown(x: number, y: number): void {
    if (this.hitRect(x, y, this.menuBtnRect)) {
      this.onMenu();
    } else if (this.hitRect(x, y, this.replayBtnRect)) {
      this.onReplay();
    } else if (this.hitRect(x, y, this.nextBtnRect)) {
      this.onNext();
    }
  }

  private hitRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  render(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    // 배경
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const cardW = Math.min(360, W * 0.9);
    const cardH = 380;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    // 카드
    ctx.fillStyle = COLORS.card;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    // 파티클 이모지
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', W / 2, cardY + 55);

    // 완성 메시지
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('퍼즐 완성!', W / 2, cardY + 110);

    // 레벨 이름
    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.subText;
    ctx.fillText(`${this.level.emoji} ${this.level.name}`, W / 2, cardY + 138);

    // 별점 (애니메이션)
    const starSize = 40;
    const starGap = 12;
    const totalStarW = 3 * starSize + 2 * starGap;
    const starStartX = W / 2 - totalStarW / 2;
    const starY = cardY + 185;

    for (let i = 0; i < 3; i++) {
      const sx = starStartX + i * (starSize + starGap);
      const filled = i < this.starReveal;

      // 별 스케일 애니메이션
      const scale = filled ? Math.min(1, (this.animTimer - i * 0.3) / 0.15) : 1;
      ctx.save();
      ctx.translate(sx + starSize / 2, starY + starSize / 2);
      ctx.scale(scale, scale);

      ctx.font = `${starSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = filled ? COLORS.star : COLORS.starEmpty;
      ctx.fillText(filled ? '⭐' : '☆', 0, 0);

      ctx.restore();
    }

    // 시간
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${this.formatTime(this.progress.bestTime)}`, W / 2, cardY + 250);

    // 버튼들
    const btnW = 90;
    const btnH = 44;
    const btnY = cardY + cardH - 70;
    const gap = 12;
    const totalBtnW = 3 * btnW + 2 * gap;
    const btnStartX = W / 2 - totalBtnW / 2;

    // 목록 버튼
    this.menuBtnRect = { x: btnStartX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = '#7f8c8d';
    this.roundRect(ctx, btnStartX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📋 목록', btnStartX + btnW / 2, btnY + btnH / 2);

    // 다시하기 버튼
    this.replayBtnRect = { x: btnStartX + btnW + gap, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = COLORS.accent;
    this.roundRect(ctx, btnStartX + btnW + gap, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.fillText('🔄 다시', btnStartX + btnW + gap + btnW / 2, btnY + btnH / 2);

    // 다음 버튼
    this.nextBtnRect = { x: btnStartX + 2 * (btnW + gap), y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = COLORS.nextBtn;
    this.roundRect(ctx, btnStartX + 2 * (btnW + gap), btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.buttonText;
    ctx.fillText('▶ 다음', btnStartX + 2 * (btnW + gap) + btnW / 2, btnY + btnH / 2);
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
