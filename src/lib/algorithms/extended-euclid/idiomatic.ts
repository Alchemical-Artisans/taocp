export function extended_euclids_algorithm(
  m: number,
  n: number,
): { a: number; b: number; d: number } {
  const r = m % n
  if (r == 0) return { a: 0, b: 1, d: n }
  const { a, b, d } = extended_euclids_algorithm(n, r)
  return { a: b, b: a - Math.floor(m / n) * b, d }
}
