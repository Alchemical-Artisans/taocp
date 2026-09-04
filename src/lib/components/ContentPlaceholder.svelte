<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="placeholder">
	{#if children}
		{@render children()}
	{:else}
		<p>Content for this page hasn't been written yet.</p>
	{/if}
</div>

<style>
	.placeholder {
		max-width: 68ch;
		border: 1px dashed var(--line);
		border-radius: 8px;
		padding: 20px 22px;
		color: var(--ink-faint);
		font-size: 0.92rem;
	}
	.placeholder :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
