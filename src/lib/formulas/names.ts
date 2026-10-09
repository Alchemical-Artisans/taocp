/**
 * Facts about the shape of a formula table that its callers need before the
 * algebra engine is loaded. Kept clear of `tabulate.ts` so that reading a label
 * does not pull the engine into the page with it.
 */

/** The variable every formula is a function of, and the one the table walks. */
export const VARIABLE = "x"

/** How many values of the variable a table shows. */
export const SAMPLE_COUNT = 10

/**
 * The name each line of a table is given, by position.
 *
 * Every line is a definition, so it needs a name whether or not the reader
 * wants one — and a name they did not choose has to be one they would never
 * mistake for something else. These are the letters left once the ones that
 * read as a variable, an index or a constant are out: no `x`, `y` or `z`, no
 * `i`, `j`, `k`, `m` or `n`, no `e`, and none of `a` through `d`.
 *
 * The table ends where the list does. Ten columns is already past what can be
 * read side by side, and a generated eleventh name would be worse than none.
 */
export const NAMES = ["f", "g", "h", "p", "q", "r", "s", "u", "v", "w"]
