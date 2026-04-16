/**
 * 엔트리 포인트
 * Entry point for the Nonogram game
 */

import { App } from './App';

window.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  await app.init();
});
