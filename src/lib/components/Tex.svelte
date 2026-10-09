<script lang="ts">
  import katex from "katex"
  import "katex/dist/katex.min.css"

  /**
   * Typeset a TeX expression in the browser.
   *
   * The site's own prose math is typeset by MathJax during the build and ships
   * as SVG — see src/lib/tex/README.md. This is for the other case: math a
   * reader types, which cannot be known until they type it. KaTeX is what loads
   * instead of MathJax, being a fraction of the size and already cut from the
   * same Computer Modern cloth as the build-time font.
   */
  let { tex, display = false }: { tex: string; display?: boolean } = $props()

  /* KaTeX escapes what it cannot typeset and, left untrusted as it is by
     default, refuses \href, \url and \includegraphics outright — so reader
     input cannot reach the page as markup. Anything it rejects falls through to
     the raw TeX below, which is more use to the reader than KaTeX's red
     error text. */
  const rendered = $derived.by(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        output: "htmlAndMathml",
        strict: false,
      })
    } catch {
      return null
    }
  })
</script>

{#if rendered}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html rendered}
{:else}
  <code>{tex}</code>
{/if}
