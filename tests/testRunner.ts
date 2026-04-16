/**
 * 공통 테스트 헬퍼
 * Shared test runner utilities
 */

export let passed = 0;
export let failed = 0;

export function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${e}`);
    failed++;
  }
}

export function describe(label: string, fn: () => void): void {
  console.log(`\n📋 ${label}`);
  fn();
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected)
        throw new Error(`기대값: ${JSON.stringify(expected)}, 실제값: ${JSON.stringify(actual)}`);
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`기대값: ${JSON.stringify(expected)}, 실제값: ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual)
        throw new Error(`truthy를 기대했지만 ${JSON.stringify(actual)} 반환`);
    },
    toBeFalsy() {
      if (actual)
        throw new Error(`falsy를 기대했지만 ${JSON.stringify(actual)} 반환`);
    },
    toBeGreaterThan(expected: number) {
      if ((actual as number) <= expected)
        throw new Error(`${JSON.stringify(actual)} > ${expected} 기대`);
    },
    toBeLessThan(expected: number) {
      if ((actual as number) >= expected)
        throw new Error(`${JSON.stringify(actual)} < ${expected} 기대`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      if ((actual as number) < expected)
        throw new Error(`${JSON.stringify(actual)} >= ${expected} 기대`);
    },
    toBeLessThanOrEqual(expected: number) {
      if ((actual as number) > expected)
        throw new Error(`${JSON.stringify(actual)} <= ${expected} 기대`);
    },
  };
}

export function printSummary(): void {
  const total = passed + failed;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`결과: ${passed}/${total} 통과 ${failed > 0 ? `(${failed}개 실패)` : '✨'}`);
  if (failed > 0) process.exit(1);
}
