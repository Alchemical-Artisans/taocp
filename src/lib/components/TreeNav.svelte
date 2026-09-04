<script lang="ts">
  import { page } from "$app/state"
  import { SvelteSet } from "svelte/reactivity"
  import { toc, resolvePath, chapterHref, sectionHref } from "$lib/data/toc"

  const current = $derived(resolvePath(page.url.pathname))

  const openVolumes = new SvelteSet(toc.filter((v) => v.chapters.length > 0).map((v) => v.id))

  function toggleVolume(id: string) {
    if (openVolumes.has(id)) {
      openVolumes.delete(id)
    } else {
      openVolumes.add(id)
    }
  }
</script>

<nav class="tree" aria-label="Book contents">
  {#each toc as volume (volume.id)}
    {@const isOpen = openVolumes.has(volume.id)}
    <div class="vol-group">
      <button
        type="button"
        class="vol-head"
        class:open={isOpen}
        aria-expanded={isOpen}
        disabled={volume.chapters.length === 0}
        onclick={() => toggleVolume(volume.id)}
      >
        <span>Vol. {volume.number} — {volume.title}</span>
        {#if volume.chapters.length}
          <span class="chev" aria-hidden="true">{isOpen ? "−" : "+"}</span>
        {/if}
      </button>

      {#if isOpen}
        {#if volume.chapters.length === 0}
          <p class="empty-note">No chapters yet.</p>
        {/if}
        {#each volume.chapters as chapter (chapter.id)}
          <div class="chapter-head">
            {#if chapter.sections.length === 0}
              <a
                href={chapterHref(volume, chapter)}
                class:active={current?.chapter?.id === chapter.id}
              >
                Ch. {chapter.number}
                {chapter.title}
              </a>
            {:else}
              <span>Ch. {chapter.number} {chapter.title}</span>
            {/if}
          </div>
          {#if chapter.sections.length}
            <ul>
              {#each chapter.sections as section (section.id)}
                <li>
                  <a
                    href={sectionHref(volume, chapter, section)}
                    class:active={current?.section?.id === section.id}
                  >
                    {section.number}
                    {section.title}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        {/each}
      {/if}
    </div>
  {/each}
</nav>

<style>
  .tree {
    background: var(--rail);
    border-right: 1px solid var(--line);
    padding: 22px 14px 40px;
    font-size: 0.86rem;
    position: sticky;
    top: 52px;
    height: calc(100vh - 52px);
    overflow-y: auto;
  }
  .vol-group {
    margin-bottom: 4px;
  }
  .vol-head {
    width: 100%;
    font: inherit;
    font-weight: 700;
    text-align: left;
    background: none;
    border: none;
    padding: 7px 10px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .vol-head:hover:not(:disabled),
  .vol-head:focus-visible {
    background: var(--surface);
  }
  .vol-head.open {
    color: var(--ink);
  }
  .vol-head:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .chev {
    font-family: "Space Mono", ui-monospace, monospace;
    color: var(--ink-faint);
  }
  .chapter-head {
    padding: 6px 10px 6px 20px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .chapter-head a {
    color: inherit;
    text-decoration: none;
  }
  .chapter-head a:hover,
  .chapter-head a.active {
    color: var(--accent);
  }
  .empty-note {
    margin: 2px 0 8px;
    padding: 0 10px 0 20px;
    color: var(--ink-faint);
    font-size: 0.8rem;
    font-style: italic;
  }
  ul {
    list-style: none;
    margin: 0 0 6px;
    padding: 0;
  }
  li a {
    display: block;
    padding: 5px 10px 5px 34px;
    color: var(--ink-soft);
    text-decoration: none;
    border-radius: 6px;
    border-left: 2px solid transparent;
  }
  li a:hover {
    background: var(--surface);
    color: var(--ink);
  }
  li a.active {
    color: var(--accent);
    border-left-color: var(--accent);
    background: var(--accent-tint);
    font-weight: 600;
  }
</style>
