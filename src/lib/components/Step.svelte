<script lang="ts">
  import { getContext, type Snippet } from "svelte"
  import AlgorithmLetter from "./AlgorithmLetter.svelte"
  import { ALGORITHM, highlight, type AlgorithmContext } from "./highlight.svelte"

  type Props = {
    /** The step's number within its algorithm: 1 for F1, 2 for F2. */
    n: number
    /** The step itself, brackets and all, as Knuth writes it. */
    children: Snippet
  }

  let { n, children }: Props = $props()

  const algorithm = getContext<AlgorithmContext>(ALGORITHM)
  const id = $derived(`${algorithm.letter}${n}`)
</script>

<li
  class:lit={highlight.step === id}
  onmouseenter={() => highlight.hoverStep(id)}
  onmouseleave={() => highlight.hoverStep(null)}
>
  <b><AlgorithmLetter />{n}.</b>
  {@render children()}
</li>

<style>
  li {
    padding: 2px 8px;
    margin: 0 -8px;
    border-radius: 5px;
    transition: background-color 90ms ease;
  }

  .lit {
    background: var(--accent-tint);
  }
</style>
