<script lang="ts">
	type Heading = { id: string; label: string };
	type CrossRef = { href: string; label: string };

	let { onThisPage = [], crossRefs = [] }: { onThisPage?: Heading[]; crossRefs?: CrossRef[] } =
		$props();
</script>

<aside class="rail">
	<div class="rail-block">
		<h3>On this page</h3>
		{#if onThisPage.length}
			<ul>
				{#each onThisPage as item (item.id)}
					<li><a href="#{item.id}">{item.label}</a></li>
				{/each}
			</ul>
		{:else}
			<p class="empty-note">Nothing on this page yet.</p>
		{/if}
	</div>
	<div class="rail-block">
		<h3>Cross-references</h3>
		{#if crossRefs.length}
			<ul>
				{#each crossRefs as ref (ref.href)}
					<li><a href={ref.href}>{ref.label}</a></li>
				{/each}
			</ul>
		{:else}
			<p class="empty-note">No cross-references yet.</p>
		{/if}
	</div>
</aside>

<style>
	.rail {
		padding: 32px 22px 40px;
		border-left: 1px solid var(--line);
		font-size: 0.85rem;
		position: sticky;
		top: 52px;
		height: calc(100vh - 52px);
		overflow-y: auto;
	}
	.rail-block {
		margin-bottom: 28px;
	}
	h3 {
		font-family: 'Libre Franklin', ui-sans-serif, system-ui, sans-serif;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-faint);
		margin: 0 0 12px;
		font-weight: 700;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	a {
		color: var(--ink-soft);
		text-decoration: none;
	}
	a:hover {
		color: var(--accent);
	}
	.empty-note {
		margin: 0;
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
