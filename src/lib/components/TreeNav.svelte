<script lang="ts">
  import { page } from "$app/state"
  import { SvelteSet } from "svelte/reactivity"
  import { toc, resolvePath, chapterHref, sectionHref, subsectionHref } from "$lib/data/toc"

  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props()

  const current = $derived(resolvePath(page.url.pathname))

  const openVolumes = new SvelteSet(toc.filter((v) => v.chapters.length > 0).map((v) => v.id))

  let navElement: HTMLElement | undefined = $state()

  /* The rest of the page is made `inert` while the drawer is open, so this is
     the only place focus can usefully land — without it, focus stays on the
     (now inert) element that was focused before the drawer opened. */
  $effect(() => {
    if (open) navElement?.focus()
  })

  function toggleVolume(id: string) {
    if (openVolumes.has(id)) {
      openVolumes.delete(id)
    } else {
      openVolumes.add(id)
    }
  }

  $effect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  })
</script>

<svelte:window
  onkeydown={(e) => {
    if (open && e.key === "Escape") onClose?.()
  }}
/>

{#if open}
  <div class="backdrop" aria-hidden="true" onclick={() => onClose?.()}></div>
{/if}

<nav
  id="tree-nav"
  class="tree"
  class:open
  aria-label="Book contents"
  tabindex="-1"
  bind:this={navElement}
>
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
                aria-current={current?.chapter?.id === chapter.id ? "page" : undefined}
              >
                Ch. {chapter.number} — {chapter.title}
              </a>
            {:else}
              <span>Ch. {chapter.number} — {chapter.title}</span>
            {/if}
          </div>
          {#if chapter.sections.length}
            <ul>
              {#each chapter.sections as section (section.id)}
                <li>
                  {#if section.subsections.length === 0}
                    <a
                      href={sectionHref(volume, chapter, section)}
                      class:active={current?.section?.id === section.id && !current?.subsection}
                      aria-current={current?.section?.id === section.id && !current?.subsection
                        ? "page"
                        : undefined}
                    >
                      {section.number}
                      {section.title}
                    </a>
                  {:else}
                    <span class="section-head">
                      {section.number}
                      {section.title}
                    </span>
                    <ul>
                      {#each section.subsections as subsection (subsection.id)}
                        <li>
                          <a
                            href={subsectionHref(volume, chapter, section, subsection)}
                            class:active={current?.subsection?.id === subsection.id}
                            aria-current={current?.subsection?.id === subsection.id
                              ? "page"
                              : undefined}
                          >
                            {subsection.number}
                            {subsection.title}
                          </a>
                        </li>
                      {/each}
                    </ul>
                  {/if}
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
  /* A section that only groups subsections has no page of its own, so it reads
     as a label rather than a dead link. */
  .section-head {
    display: block;
    padding: 5px 10px 5px 34px;
    color: var(--ink-faint);
  }
  li li a {
    padding-left: 48px;
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

  .backdrop {
    display: none;
  }

  @media (max-width: 760px) {
    .tree {
      display: none;
    }
    .tree.open {
      display: block;
      position: fixed;
      top: 52px;
      left: 0;
      bottom: 0;
      height: auto;
      width: min(82vw, 320px);
      z-index: 15;
      box-shadow: var(--shadow);
    }
    .backdrop {
      display: block;
      position: fixed;
      inset: 52px 0 0 0;
      background: rgba(0, 0, 0, 0.4);
      border: none;
      padding: 0;
      z-index: 14;
    }
  }
</style>
