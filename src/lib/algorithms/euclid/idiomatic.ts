export function euclids_algorithm(m: number, n: number) {
  const r = m % n
  if (r == 0) return n
  return euclids_algorithm(n, r)
}
