export function extended_euclids_algorithm(m: number, n: number) {
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

    // E3
    if (r == 0) return { a, b, d }

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
