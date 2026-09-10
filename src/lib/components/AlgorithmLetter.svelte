<script lang="ts">
  import { getContext } from "svelte"
  import { ALGORITHM, highlight, type AlgorithmContext } from "./highlight.svelte"

  const algorithm = getContext<AlgorithmContext>(ALGORITHM)
</script>

<!--
  A single glyph is a small target, so the padding below widens it without
  moving the text around it. Pointer only: making every letter focusable would
  bury the real controls on the page under a pile of tab stops, and nothing here
  is unavailable elsewhere.
-->
<!--
  No role, because the letter is not a control and carries nothing the sentence
  around it does not already say. Tinting the related letters is decoration for
  a reader who happens to be pointing at one, so there is nothing here for a
  screen reader to miss.
-->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  class="letter"
  class:lit={highlight.letter === algorithm.letter}
  onmouseenter={() => highlight.hoverLetter(algorithm.letter)}
  onmouseleave={() => highlight.hoverLetter(null)}>{algorithm.letter}</span
>

<style>
  .letter {
    padding: 0.15em 0.1em;
    margin: -0.15em -0.1em;
    border-radius: 3px;
    transition:
      color 90ms ease,
      background-color 90ms ease;
  }

  .lit {
    color: var(--accent);
    background: var(--accent-tint);
  }
</style>
