<script lang="ts">
  import CodeTabs from "./CodeTabs.svelte"
  import faithfulSource from "$lib/algorithms/euclid/faithful.ts?raw"
  import idiomaticSource from "$lib/algorithms/euclid/idiomatic.ts?raw"
</script>

<CodeTabs {faithful} {idiomatic} />

{#snippet faithful()}{faithfulSource}{/snippet}
{#snippet idiomatic()}{idiomaticSource}{/snippet}
