<script lang="ts">
  import "./layout.css"
  import favicon from "$lib/assets/favicon.svg"
  import { page } from "$app/state"
  import TopBar from "$lib/components/TopBar.svelte"
  import TreeNav from "$lib/components/TreeNav.svelte"
  import RightRail from "$lib/components/RightRail.svelte"
  import { resolvePath, chapterHref } from "$lib/data/toc"

  let { children } = $props()

  const current = $derived(resolvePath(page.url.pathname))
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Space+Mono:wght@400;700&display=swap"
  />
</svelte:head>

<TopBar />

<div class="layout">
  <TreeNav />

  <main>
    {#if current}
      <div class="breadcrumb">
        <a href="/">Home</a>
        <span>›</span>
        <span>Vol. {current.volume.number}</span>
        {#if current.chapter}
          <span>›</span>
          {#if current.chapter.sections.length === 0}
            <a href={chapterHref(current.volume, current.chapter)}>Ch. {current.chapter.number}</a>
          {:else}
            <span>Ch. {current.chapter.number}</span>
          {/if}
        {/if}
        {#if current.section}
          <span>›</span>
          <span>{current.section.number}</span>
        {/if}
      </div>
      <h1>
        {#if current.section}
          <span class="secno">{current.section.number}</span>{current.section.title}
        {:else if current.chapter}
          <span class="secno">{current.chapter.number}</span>{current.chapter.title}
        {:else}
          <span class="secno">{current.volume.number}</span>{current.volume.title}
        {/if}
      </h1>
    {/if}

    {@render children()}
  </main>

  <RightRail />
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 268px minmax(0, 1fr) 232px;
    max-width: 1440px;
    margin: 0 auto;
  }

  main {
    padding: 40px 56px 80px;
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: "Space Mono", ui-monospace, monospace;
    font-size: 0.76rem;
    color: var(--ink-faint);
    margin-bottom: 18px;
  }
  .breadcrumb a {
    color: inherit;
    text-decoration: none;
  }
  .breadcrumb a:hover {
    color: var(--accent);
  }

  main h1 {
    font-family: "Spectral", Georgia, serif;
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 28px;
    text-wrap: balance;
  }
  .secno {
    font-family: "Space Mono", ui-monospace, monospace;
    color: var(--accent);
    font-size: 1.1rem;
    margin-right: 10px;
  }

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 240px 1fr;
    }
    .layout :global(aside.rail) {
      display: none;
    }
  }
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .layout :global(nav.tree) {
      display: none;
    }
    main {
      padding: 28px 20px 60px;
    }
  }
</style>
