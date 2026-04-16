/**
 * 통합 입력 관리자 (마우스 + 터치)
 * Unified input manager for mouse and touch events
 */

export type InputCallback = (x: number, y: number, secondary: boolean) => void;
export type InputMoveCallback = (x: number, y: number) => void;
export type InputUpCallback = (x: number, y: number) => void;

export class InputManager {
  private canvas: HTMLCanvasElement;
  private onDown: InputCallback | null = null;
  private onMove: InputMoveCallback | null = null;
  private onUp: InputUpCallback | null = null;
  private onSecondary: InputCallback | null = null;

  private longPressTimer: number | null = null;
  private longPressThreshold = 400; // ms
  private longPressX = 0;
  private longPressY = 0;
  private longPressFired = false;
  private isDragging = false;
  private isDown = false;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  setOnDown(cb: InputCallback): void { this.onDown = cb; }
  setOnMove(cb: InputMoveCallback): void { this.onMove = cb; }
  setOnUp(cb: InputUpCallback): void { this.onUp = cb; }
  setOnSecondary(cb: InputCallback): void { this.onSecondary = cb; }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private bindEvents(): void {
    // 마우스 이벤트
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      const isSecondary = e.button === 2;
      this.isDown = true;
      this.isDragging = false;
      this.lastX = pos.x;
      this.lastY = pos.y;
      if (isSecondary) {
        this.onSecondary?.(pos.x, pos.y, true);
      } else {
        this.onDown?.(pos.x, pos.y, false);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      if (!this.isDown) return;
      this.isDragging = true;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.lastX = pos.x;
      this.lastY = pos.y;
      this.onMove?.(pos.x, pos.y);
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDown) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.isDown = false;
      this.isDragging = false;
      this.onUp?.(pos.x, pos.y);
    });

    // 우클릭 메뉴 비활성화
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 터치 이벤트
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.longPressX = pos.x;
      this.longPressY = pos.y;
      this.lastX = pos.x;   // touchend에서 사용할 마지막 위치 기록
      this.lastY = pos.y;
      this.longPressFired = false;
      this.isDown = true;
      this.isDragging = false;

      this.longPressTimer = window.setTimeout(() => {
        if (this.isDown && !this.isDragging) {
          this.longPressFired = true;
          this.onSecondary?.(this.longPressX, this.longPressY, true);
        }
      }, this.longPressThreshold);

      this.onDown?.(pos.x, pos.y, false);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.lastX = pos.x;
      this.lastY = pos.y;

      // 드래그 감지
      const dx = pos.x - this.longPressX;
      const dy = pos.y - this.longPressY;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        this.isDragging = true;
        if (this.longPressTimer !== null) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }

      this.onMove?.(pos.x, pos.y);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.isDown = false;
      this.isDragging = false;
      this.onUp?.(this.lastX, this.lastY);
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.isDown = false;
      this.isDragging = false;
      this.onUp?.(this.lastX, this.lastY);
    }, { passive: false });
  }

  destroy(): void {
    // 이벤트 리스너 정리 (재사용 시)
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
    }
  }
}
