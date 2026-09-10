<script lang="ts">
  import type { Snippet } from "svelte"

  type Props = {
    /**
     * Diagram source. Import a `.mmd` file with `?raw`, the way the code samples
     * import their modules, or pass a template literal.
     */
    chart?: string
    /**
     * Never render a diagram written between the tags — it cannot survive the
     * trip. This is declared only so that doing it reports itself instead of
     * drawing nothing.
     */
    children?: Snippet
  }

  let { chart, children }: Props = $props()

  let svg = $state("")
  let failure = $state("")
  let dark = $state(false)

  /* Mermaid needs an id that is unique per render: it mounts the diagram off
     screen under that id before handing back the markup. */
  let renders = 0

  const MISUSE =
    "Pass the diagram to Mermaid as chart={...} rather than writing it between " +
    "the tags. Svelte collapses whitespace in template text and Prettier " +
    "reflows it, so the line breaks Mermaid's grammar depends on are gone " +
    "before the component ever sees them."

  $effect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () => {
      const chosen = document.documentElement.dataset.theme
      dark = chosen ? chosen === "dark" : query.matches
    }

    update()
    query.addEventListener("change", update)
    /* layout.css lets an explicit choice override the media query, so follow
       the attribute too. */
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] })

    return () => {
      query.removeEventListener("change", update)
      observer.disconnect()
    }
  })

  $effect(() => {
    if (children) {
      failure = MISUSE
      svg = ""
      return
    }

    /* Read both dependencies before the first await, so the effect re-runs when
       the diagram changes and when the reader switches theme. */
    const theme = dark ? "dark" : "default"
    const source = (chart ?? "").trim()
    if (!source) return

    const render = ++renders
    const stale = () => render !== renders

    void (async () => {
      try {
        /* Imported here rather than at the top so Mermaid stays out of the
           server bundle and lands in a chunk only pages with a diagram load. */
        const { default: mermaid } = await import("mermaid")
        if (stale()) return

        mermaid.initialize({
          startOnLoad: false,
          theme,
          themeVariables: palette(),
          fontFamily: '"Libre Franklin", ui-sans-serif, system-ui, sans-serif',
        })

        const result = await mermaid.render(`mermaid-${render}`, source)
        if (stale()) return

        svg = result.svg
        failure = ""
      } catch (error) {
        if (stale()) return
        svg = ""
        failure = (error as Error).message
      }
    })()
  })

  /* Mermaid picks its own palette, which would sit oddly against the page in
     either theme, so hand it the site's colours.

     Only variables that actually resolve are passed on: getPropertyValue gives
     back "" for one that is missing, and Mermaid throws "Unsupported color
     format" on that rather than falling back, which would take out every
     diagram on the site over a single renamed variable. */
  function palette(): Record<string, string> {
    const style = getComputedStyle(document.documentElement)
    const variables = {
      background: "--surface",
      mainBkg: "--accent-tint",
      primaryColor: "--accent-tint",
      primaryTextColor: "--ink",
      primaryBorderColor: "--accent",
      secondaryColor: "--rail",
      tertiaryColor: "--surface",
      lineColor: "--ink-soft",
      textColor: "--ink",
    }

    return Object.fromEntries(
      Object.entries(variables)
        .map(([option, variable]) => [option, style.getPropertyValue(variable).trim()])
        .filter(([, value]) => value !== ""),
    )
  }
</script>

<figure class="mermaid">
  {#if svg}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Mermaid's own output. -->
    {@html svg}
  {:else if failure}
    <p class="failure">{failure}</p>
  {/if}

  <!-- Until the chunk arrives, and if it never does, the source is still worth
       reading. It stays put once drawn so a theme change can redraw from it. -->
  <pre class="source" hidden={Boolean(svg)}>{chart ?? ""}</pre>
</figure>

<style>
  .mermaid {
    margin: 1.4em 0;
    text-align: center;
    /* A wide diagram scrolls rather than widening the page on a phone. */
    overflow-x: auto;
  }

  .mermaid :global(svg) {
    max-width: 100%;
    height: auto;
  }

  .source {
    margin: 0;
    padding: 14px 16px;
    text-align: left;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    font-family: "Space Mono", ui-monospace, monospace;
    font-size: 0.82rem;
    line-height: 1.65;
    overflow-x: auto;
  }

  .source:empty {
    display: none;
  }

  .failure {
    margin: 0 0 0.6em;
    text-align: left;
    color: var(--danger);
    font-style: italic;
  }

  [hidden] {
    display: none;
  }
</style>
