import MagicString from "magic-string"
import type { PreprocessorGroup } from "svelte/compiler"
import { scan } from "./scan.ts"
import { renderTex } from "./render.ts"

/**
 * Replaces `$...$` and `$$...$$` in Svelte markup with MathJax's SVG output at
 * build time, so pages ship typeset math and no MathJax runtime.
 */
export function tex(): PreprocessorGroup {
  return {
    name: "tex",
    markup({ content, filename }) {
      const spans = scan(content)
      if (spans.length === 0) return

      const rewritten = new MagicString(content)
      for (const span of spans) {
        let svg: string
        try {
          svg = renderTex(span.tex, { display: span.display })
        } catch (error) {
          throw new Error(`${at(content, span.start, filename)}: ${(error as Error).message}`, {
            cause: error,
          })
        }
        rewritten.overwrite(span.start, span.end, escapeBraces(svg))
      }

      return { code: rewritten.toString(), map: rewritten.generateMap({ hires: true }) }
    },
  }
}

/**
 * MathJax does not emit braces today, but Svelte would read any it did emit as
 * an expression tag, so they are neutralised before the output rejoins the
 * template.
 */
function escapeBraces(svg: string): string {
  return svg.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
}

function at(content: string, offset: number, filename: string | undefined): string {
  const before = content.slice(0, offset).split("\n")
  return `${filename ?? "<unknown>"}:${before.length}:${before[before.length - 1].length + 1}`
}
