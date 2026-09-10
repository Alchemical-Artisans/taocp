export type Step = { m: number; n: number; r: number }

/**
 * The states Algorithm E passes through on its way to an answer, for showing
 * the work rather than just the result. Each step records the m and n that E1
 * starts from and the remainder it finds. Only the final step has r === 0, and
 * its n is the greatest common divisor.
 *
 * As with the algorithm itself, m and n must both be positive integers.
 */
export function trace(m: number, n: number): Step[] {
  const steps: Step[] = []

  while (true) {
    const r = m % n
    steps.push({ m, n, r })
    if (r === 0) return steps
    m = n
    n = r
  }
}
