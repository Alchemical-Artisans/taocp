<script lang="ts">
  import Spoiler from "./Spoiler.svelte"

  let {
    label,
    open = false,
    inline = false,
  }: { label?: string; open?: boolean; inline?: boolean } = $props()
</script>

{#if inline}
  <p>The remainder <Spoiler {label} {open} inline>strictly decreases</Spoiler> each round.</p>
{:else}
  <p>Exercise 1. Prove it.</p>

  <Spoiler {label} {open}>
    <p>Because the remainder strictly decreases.</p>
  </Spoiler>
{/if}
