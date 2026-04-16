/**
 * 메뉴 씬 - 레벨 선택 화면
 * Menu scene with level selection and scroll support
 */

import { Scene } from './Scene';
import { LevelData, LevelProgress } from '../types';

interface MenuSceneData {
  levels: LevelData[];
  progressMap: Map<number, LevelProgress>;
  onSelectLevel: (levelId: number) => void;
}

const COLORS = {
  bg: '#1a1a2e',
  header: '#16213e',
  cardBg: '#0f3460',
  cardHover: '#1a4a7a',
  cardCompleted: '#1a5c2e',
  cardLocked: '#2a2a3e',
  text: '#ecf0f1',
  subText: '#95a5a6',
  accent: '#e94560',
  star: '#f39c12',
  easy: '#27ae60',
  medium: '#f39c12',
  hard: '#e67e22',
  expert: '#e74c3c',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
  expert: '전문가',
};

export const HEADER_H = 80;
export const SCROLLBAR_MARGIN = 10;
export const SCROLLBAR_WIDTH = 4;
export const SCROLLBAR_RIGHT_GAP = 4;

export class MenuScene extends Scene {
  private levels: LevelData[] = [];
  private progressMap: Map<number, LevelProgress> = new Map();
  private onSelectLevel: ((levelId: number) => void) | null = null;
  private scrollY = 0;
  private targetScrollY = 0;
  private maxScroll = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartScrollY = 0;
  private hoveredCard = -1;
  private cardRects: Array<{ id: number; x: number; y: number; w: number; h: number }> = [];
  private touchStartY = 0;
  private lastTouchY = 0;
  private velocity = 0;
  private isPointerDown = false;

  enter(data?: unknown): void {
    const d = data as MenuSceneData;
    this.levels = d.levels;
    this.progressMap = d.progressMap;
    this.onSelectLevel = d.onSelectLevel;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.hoveredCard = -1;
  }

  exit(): void {
    // 정리
  }

  handlePointerDown(x: number, y: number): void {
    this.isPointerDown = true;
    this.isDragging = false;
    this.dragStartY = y;
    this.dragStartScrollY = this.scrollY;
    this.touchStartY = y;
    this.lastTouchY = y;
    this.velocity = 0;
  }

  handlePointerMove(x: number, y: number): void {
    if (!this.isPointerDown) return;
    const dy = y - this.touchStartY;
    if (Math.abs(dy) > 5) this.isDragging = true;
    if (this.isDragging) {
      const delta = this.lastTouchY - y;
      this.velocity = delta;
      this.targetScrollY = this.dragStartScrollY + (this.dragStartY - y);
      this.targetScrollY = Math.max(0, Math.min(this.maxScroll, this.targetScrollY));
      this.scrollY = this.targetScrollY;
    }
    this.lastTouchY = y;
    // 스크린 y → 카드 로컬 y 변환: y + scrollY - HEADER_H
    this.hoveredCard = this.getCardAt(x, y + this.scrollY - HEADER_H);
  }

  handlePointerUp(x: number, y: number): void {
    if (!this.isDragging) {
      // 탭 처리: 스크린 y → 카드 로컬 y 변환
      const cardId = this.getCardAt(x, y + this.scrollY - HEADER_H);
      if (cardId >= 0) {
        this.onSelectLevel?.(cardId);
      }
    }
    this.isPointerDown = false;
    // 관성 스크롤 시작
    this.targetScrollY = Math.max(0, Math.min(this.maxScroll, this.targetScrollY + this.velocity * 5));
    this.isDragging = false;
  }

  private getCardAt(x: number, localY: number): number {
    for (const rect of this.cardRects) {
      if (x >= rect.x && x <= rect.x + rect.w &&
          localY >= rect.y && localY <= rect.y + rect.h) {
        return rect.id;
      }
    }
    return -1;
  }

  update(dt: number): void {
    // 부드러운 스크롤 보간
    const diff = this.targetScrollY - this.scrollY;
    if (Math.abs(diff) > 0.5) {
      this.scrollY += diff * 0.2;
    } else {
      this.scrollY = this.targetScrollY;
    }
  }

  handleScroll(delta: number): void {
    this.targetScrollY = Math.max(0, Math.min(this.maxScroll, this.targetScrollY + delta));
  }

  render(): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    // 배경
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // 헤더
    ctx.fillStyle = COLORS.header;
    ctx.fillRect(0, 0, W, HEADER_H);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧩 네모네모 로직', W / 2, HEADER_H / 2);

    // 레벨 카드 그리기
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEADER_H, W, H - HEADER_H);
    ctx.clip();
    ctx.translate(0, -this.scrollY + HEADER_H);

    this.cardRects = [];
    const padding = 12;
    const cardW = Math.min(160, (W - padding * 3) / 2);
    const cardH = 110;
    const cols = Math.floor(W / (cardW + padding));
    const actualCols = Math.max(2, Math.min(4, cols));
    const totalCardW = actualCols * cardW + (actualCols - 1) * padding;
    const offsetX = (W - totalCardW) / 2;

    let maxY = 0;

    this.levels.forEach((level, idx) => {
      const col = idx % actualCols;
      const row = Math.floor(idx / actualCols);
      const cardX = offsetX + col * (cardW + padding);
      const cardY = row * (cardH + padding) + padding;

      // cardY는 translate 적용 전 로컬 Y — 히트 테스트에서 (screenY + scrollY - HEADER_H)와 비교
      this.cardRects.push({ id: level.id, x: cardX, y: cardY, w: cardW, h: cardH });

      const progress = this.progressMap.get(level.id);
      const completed = progress?.completed || false;
      const stars = progress?.stars || 0;

      const isHovered = this.hoveredCard === level.id;
      let bgColor = COLORS.cardBg;
      if (completed) bgColor = COLORS.cardCompleted;
      if (isHovered) bgColor = completed ? '#217a3d' : COLORS.cardHover;

      // 카드 배경
      ctx.fillStyle = bgColor;
      this.roundRect(ctx, cardX, cardY, cardW, cardH, 10);
      ctx.fill();

      // 완료 테두리
      if (completed) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 10);
        ctx.stroke();
      }

      // 이모지
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.emoji, cardX + cardW / 2, cardY + 28);

      // 이름
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(level.name, cardX + cardW / 2, cardY + 58);

      // 크기 표시
      ctx.fillStyle = COLORS.subText;
      ctx.font = '11px sans-serif';
      ctx.fillText(`${level.width}×${level.height}`, cardX + cardW / 2, cardY + 74);

      // 별점
      if (completed) {
        ctx.font = '14px sans-serif';
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        ctx.fillStyle = COLORS.star;
        ctx.fillText(starStr, cardX + cardW / 2, cardY + 92);
      } else {
        // 난이도 표시
        const diffColor = COLORS[level.difficulty as keyof typeof COLORS] || COLORS.subText;
        ctx.fillStyle = diffColor as string;
        ctx.font = '11px sans-serif';
        ctx.fillText(DIFFICULTY_LABELS[level.difficulty] || level.difficulty, cardX + cardW / 2, cardY + 92);
      }

      // 레벨 번호
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${level.id}`, cardX + 6, cardY + 12);

      maxY = Math.max(maxY, cardY + cardH + padding);
    });

    this.maxScroll = Math.max(0, maxY - (H - HEADER_H));

    ctx.restore();

    // 스크롤바
    if (this.maxScroll > 0) {
      const scrollRatio = this.scrollY / this.maxScroll;
      const trackH = H - HEADER_H - SCROLLBAR_MARGIN * 2;
      const thumbH = Math.max(30, trackH * ((H - HEADER_H) / (H - HEADER_H + this.maxScroll)));
      const scrollbarX = W - SCROLLBAR_WIDTH - SCROLLBAR_RIGHT_GAP;
      const thumbY = HEADER_H + SCROLLBAR_MARGIN + scrollRatio * (trackH - thumbH);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(scrollbarX, HEADER_H + SCROLLBAR_MARGIN, SCROLLBAR_WIDTH, trackH);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(scrollbarX, thumbY, SCROLLBAR_WIDTH, thumbH);
    }
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
