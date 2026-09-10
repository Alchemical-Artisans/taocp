/**
 * Macros available to every `$...$` expression on the site.
 *
 * Knuth leans on custom notation constantly, so this is the place to teach it
 * to MathJax once rather than spelling it out at each use. Values follow the
 * MathJax `macros` option: a bare string, or `[definition, argumentCount]`.
 */
export const macros: Record<string, string | [string, number]> = {
  // Knuth's preferred rendering of the "divides" and "does not divide" relations.
  divides: "\\mathbin{\\backslash}",
  // \gcd is built in; \lcm is not.
  lcm: "\\operatorname{lcm}",
}
