<script lang="ts">
  import { setContext, type Snippet } from "svelte"
  import AlgorithmLetter from "./AlgorithmLetter.svelte"
  import { ALGORITHM, type AlgorithmContext } from "./highlight.svelte"

  type Props = {
    /** The letter Knuth names the algorithm by, which its steps are numbered from. */
    letter: string
    /** The parenthesised name, as in "Algorithm F (Factorial)". */
    name: string
    /** What the algorithm is given and what it finds. */
    intro: Snippet
    /** Its steps, as `Step` components. */
    children: Snippet
  }

  let { letter, name, intro, children }: Props = $props()

  /* A getter rather than the value, so a step still reads the right letter if
     the prop ever changes. */
  setContext<AlgorithmContext>(ALGORITHM, {
    get letter() {
      return letter
    },
  })
</script>

<p>
  <b>Algorithm <AlgorithmLetter /></b>
  ({name}). {@render intro()}
</p>

<ul class="steps">{@render children()}</ul>

<style>
  .steps {
    list-style: none;
    padding-left: 0;
  }
</style>
