export function extended_euclids_algorithm(m: number, n: number, a = 0, a_prime = 1, b = 1, b_prime = 0) {
  let q = Math.floor(m / n)
  let r = m % n
  if (r == 0) return { remainder: n, a, b }

  return extended_euclids_algorithm(n, r, a_prime - q*a, a, b_prime - q*b, b_prime)
}
