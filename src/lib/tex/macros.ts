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
  // Knuth's end-of-algorithm marker: a narrow filled rule playing the role of
  // a proof tombstone. The dimensions are hand-matched to the slug printed in
  // TAOCP, which is taller and thinner than the \blackslug from manmac.tex
  // (4pt x 7.5pt). Sized in em so it tracks the surrounding text. MathJax
  // renders a bare \rule as a fixed black box, so \textcolor pins it to the
  // current text colour for dark mode.
  tombstone: "\\textcolor{currentColor}{\\rule[-0.15em]{0.2em}{0.7em}}",
}
