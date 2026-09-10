<script lang="ts">
  import Mermaid from "./Mermaid.svelte"

  /* `inline` reproduces the mistake the component has to report: a diagram
     written between the tags rather than handed over as a prop. */
  let { chart, inline = false }: { chart: string; inline?: boolean } = $props()
</script>

{#if inline}
  <Mermaid>{chart}</Mermaid>
{:else}
  <Mermaid {chart} />
{/if}
