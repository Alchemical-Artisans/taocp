/** The variables of Algorithm E as step E2 finds them, with q and r just computed. */
export type Step = {
  m: number
  n: number
  a_prime: number
  a: number
  b_prime: number
  b: number
  c: number
  d: number
  q: number
  r: number
}

/**
 * The states the extended form of Algorithm E passes through, for showing the
 * work rather than just the result. Each step records every variable as E2
 * sees it, along with the quotient and remainder E2 computes. Only the final
 * step has r === 0, and there d is the greatest common divisor of m and n while
 * a and b satisfy a·m + b·n = d.
 *
 * As with the algorithm itself, m and n must both be positive integers.
 */
export function trace(m: number, n: number): Step[] {
  const steps: Step[] = []

  // E1
  let a_prime = 1
  let b = 1
  let a = 0
  let b_prime = 0
  let c = m
  let d = n

  while (true) {
    // E2
    const q = Math.floor(c / d)
    const r = c % d
    steps.push({ m, n, a_prime, a, b_prime, b, c, d, q, r })

    // E3
    if (r === 0) return steps

    // E4
    c = d
    d = r
    let t = a_prime
    a_prime = a
    a = t - q * a
    t = b_prime
    b_prime = b
    b = t - q * b
  }
}
