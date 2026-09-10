import { mathjax } from "@mathjax/src/js/mathjax.js"
import { TeX } from "@mathjax/src/js/input/tex.js"
import { SVG } from "@mathjax/src/js/output/svg.js"
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js"
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js"
import { MathJaxNewcmFont } from "@mathjax/mathjax-newcm-font/js/svg.js"
import { macros } from "./macros.ts"

// A TeX package is only usable once its configuration module has been imported;
// v4 dropped the AllPackages barrel, so the set the site supports is explicit.
import "@mathjax/src/js/input/tex/base/BaseConfiguration.js"
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js"
import "@mathjax/src/js/input/tex/amscd/AmsCdConfiguration.js"
import "@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js"
import "@mathjax/src/js/input/tex/braket/BraketConfiguration.js"
import "@mathjax/src/js/input/tex/bussproofs/BussproofsConfiguration.js"
import "@mathjax/src/js/input/tex/cancel/CancelConfiguration.js"
import "@mathjax/src/js/input/tex/cases/CasesConfiguration.js"
import "@mathjax/src/js/input/tex/color/ColorConfiguration.js"
import "@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js"
import "@mathjax/src/js/input/tex/enclose/EncloseConfiguration.js"
import "@mathjax/src/js/input/tex/extpfeil/ExtpfeilConfiguration.js"
import "@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js"
import "@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js"
import "@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js"
import "@mathjax/src/js/input/tex/unicode/UnicodeConfiguration.js"
import "@mathjax/src/js/input/tex/upgreek/UpgreekConfiguration.js"
import "@mathjax/src/js/input/tex/verb/VerbConfiguration.js"

export const packages = [
  "base",
  "ams",
  "amscd",
  "boldsymbol",
  "braket",
  "bussproofs",
  "cancel",
  "cases",
  "color",
  "configmacros",
  "enclose",
  "extpfeil",
  "mathtools",
  "newcommand",
  "textmacros",
  "unicode",
  "upgreek",
  "verb",
]

export class TexError extends Error {}

/**
 * One document is shared by every conversion in a build. That keeps the font
 * metrics and the glyph-id counter shared too, so the `defs` ids that
 * `fontCache: "local"` emits stay unique across every expression on a page.
 */
let document: ReturnType<typeof mathjax.document> | null = null
let adaptor: ReturnType<typeof liteAdaptor> | null = null

function jax() {
  if (!document || !adaptor) {
    adaptor = liteAdaptor()
    RegisterHTMLHandler(adaptor)
    document = mathjax.document("", {
      InputJax: new TeX({ packages, macros }),
      OutputJax: new SVG({
        fontData: MathJaxNewcmFont,
        fontCache: "local",
        // MathJax 4 splits inline math across several <svg> elements so it can
        // wrap, which leaves each expression depending on <mjx-break> spacing
        // and on glyph defs living in a sibling svg. One svg per expression is
        // worth more here than wrapping: long derivations belong in $$...$$,
        // which scrolls instead.
        linebreaks: { inline: false },
      }),
    })
  }
  return { document, adaptor }
}

export interface RenderOptions {
  /** Display math (`$$...$$`) is centred on its own line; inline math flows with the text. */
  display?: boolean
}

/**
 * Convert a TeX expression to a self-contained `<mjx-container>` SVG string.
 *
 * Throws {@link TexError} rather than emitting MathJax's red error markup, so a
 * typo fails the build instead of shipping to the page.
 */
export function renderTex(tex: string, { display = false }: RenderOptions = {}): string {
  const { document, adaptor } = jax()
  const node = document.convert(tex, { display })
  const html = adaptor.outerHTML(node)

  const failure = html.match(/data-mjx-error="([^"]*)"/)
  if (failure) {
    throw new TexError(`${decodeEntities(failure[1])} in ${display ? "$$" : "$"}${tex}`)
  }
  return html
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}
