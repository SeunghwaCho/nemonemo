/**
 * 씬 기반 클래스
 * Abstract base class for all scenes
 */

export abstract class Scene {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  /**
   * 씬 진입 시 호출
   */
  abstract enter(data?: unknown): void;

  /**
   * 씬 종료 시 호출
   */
  abstract exit(): void;

  /**
   * 매 프레임 업데이트
   */
  abstract update(dt: number): void;

  /**
   * 매 프레임 렌더링
   */
  abstract render(): void;

  /**
   * CSS 픽셀 단위의 캔버스 너비
   */
  get width(): number {
    return this.canvas.clientWidth;
  }

  /**
   * CSS 픽셀 단위의 캔버스 높이
   */
  get height(): number {
    return this.canvas.clientHeight;
  }
}
