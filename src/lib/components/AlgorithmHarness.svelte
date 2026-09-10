<script lang="ts">
  import Algorithm from "./Algorithm.svelte"
  import Step from "./Step.svelte"
  import Mermaid from "./Mermaid.svelte"

  /* A second algorithm is always present, so a test can tell "every letter" from
     "every letter of this algorithm". */
  let { withDiagram = false }: { withDiagram?: boolean } = $props()
</script>

<Algorithm letter="F" name="Factorial">
  {#snippet intro()}Given a positive integer, find its factorial.{/snippet}

  <Step n={1}>[Initialize.] Set the running product to the input.</Step>
  <Step n={2}>[Is it one?] If so, the algorithm terminates.</Step>
  <Step n={3}>[Reduce.] Decrease the input and multiply.</Step>
</Algorithm>

<Algorithm letter="E" name="Euclid">
  {#snippet intro()}Given two positive integers, find their greatest common divisor.{/snippet}

  <Step n={1}>[Find remainder.] Divide and keep what is left.</Step>
</Algorithm>

{#if withDiagram}
  <Mermaid
    algorithm="F"
    chart={`flowchart LR
    F1[One]
    F2[Two]
    F3[Three]
    F1 --> F2 --> F3`}
  />
{/if}
