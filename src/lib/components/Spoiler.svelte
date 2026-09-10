<script lang="ts">
  import { untrack, type Snippet } from "svelte"

  type Props = {
    /** What the closed spoiler offers, and how it is announced before reveal. */
    label?: string
    /**
     * Hide a word or phrase mid-sentence rather than a whole answer. A block
     * spoiler is a `details`, which is not allowed inside a paragraph — it would
     * cut the sentence in two.
     */
    inline?: boolean
    /** Start revealed, for a page where the answer is the point. */
    open?: boolean
    children: Snippet
  }

  let { label = "Solution", inline = false, open = false, children }: Props = $props()

  /* `open` seeds the inline spoiler and is not a binding: once a reader has
     revealed or re-hidden it, that choice stands. */
  let revealed = $state(untrack(() => open))
</script>

{#if inline}
  <!--
    Concealed text is hidden from assistive technology as well as from the eye,
    since a spoiler read aloud is just as spoiled. The button carries the name
    until then.
  -->
  <button
    type="button"
    class="inline"
    class:revealed
    aria-expanded={revealed}
    aria-label={revealed ? undefined : `Reveal ${label.toLowerCase()}`}
    onclick={() => (revealed = !revealed)}
  >
    <span aria-hidden={!revealed}>{@render children()}</span>
  </button>
{:else}
  <!--
    A native disclosure rather than a scripted one: it is keyboard operable and
    announced correctly on its own, it survives with scripting off, and the
    answer stays collapsed on first paint instead of flashing before script
    hides it.
  -->
  <details class="spoiler" {open}>
    <summary>{label}</summary>
    <div class="body">{@render children()}</div>
  </details>
{/if}

<style>
  .spoiler {
    max-width: 68ch;
    margin: 0 0 1.4em;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    overflow: hidden;
  }

  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: var(--rail);
    border-bottom: 1px solid transparent;
    font-family: "Libre Franklin", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    cursor: pointer;
    /* The default marker is replaced below, so that it can be positioned and
       coloured with the rest of the label. */
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: "";
    width: 0;
    height: 0;
    border-left: 5px solid currentColor;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    transition: transform 120ms ease;
  }

  .spoiler[open] summary {
    color: var(--accent);
    border-bottom-color: var(--line);
  }

  .spoiler[open] summary::before {
    transform: rotate(90deg);
  }

  summary:hover {
    color: var(--ink-soft);
  }

  .spoiler[open] summary:hover {
    color: var(--accent);
  }

  summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .body {
    padding: 4px 18px 2px;
  }

  /* Prose inside a spoiler is written as page content, so it arrives with its
     own margins; the padding above only has to keep them off the border. */
  .body :global(> :first-child) {
    margin-top: 0.8em;
  }

  .body :global(> :last-child) {
    margin-bottom: 0.9em;
  }

  .inline {
    appearance: none;
    border: none;
    padding: 0 0.15em;
    border-radius: 3px;
    font: inherit;
    color: transparent;
    /* Redacted rather than blurred: blurred text of a known shape is often
       still guessable, which defeats the point. */
    background: var(--ink-soft);
    cursor: pointer;
    user-select: none;
  }

  .inline.revealed {
    color: inherit;
    background: var(--accent-tint);
    cursor: default;
    user-select: text;
  }

  .inline:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
