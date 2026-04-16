/**
 * 테스트 진입점
 * Runs all test suites in order
 */

import './nonogram.test';
import './hitTest.test';
import './levelData.test';

import { passed, failed, printSummary } from './testRunner';
printSummary();
