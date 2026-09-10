export function euclids_algorithm(m: number, n: number) {
  while (true) {
    let r: number = m % n // E1
    if (r == 0) return n // E2

    // E3
    m = n
    n = r
  }
}
