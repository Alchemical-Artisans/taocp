<script lang="ts">
  import { base } from "$app/paths"

  let { navOpen = false, onToggleNav }: { navOpen?: boolean; onToggleNav?: () => void } = $props()
</script>

<div class="topbar">
  <button
    type="button"
    class="menu-btn"
    aria-label={navOpen ? "Close contents" : "Open contents"}
    aria-expanded={navOpen}
    aria-controls="tree-nav"
    onclick={() => onToggleNav?.()}
  >
    {navOpen ? "✕" : "☰"}
  </button>
  <a class="wordmark" href="{base}/">TAOCP Companion</a>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 24px;
    height: 52px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .wordmark {
    font-family: "Libre Franklin", ui-sans-serif, system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.98rem;
    color: var(--ink);
    text-decoration: none;
  }
  .menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    margin: 0 -4px 0 -6px;
    font-family: "Space Mono", ui-monospace, monospace;
    font-size: 1.05rem;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--ink);
    cursor: pointer;
  }
  .menu-btn:hover,
  .menu-btn:focus-visible {
    background: var(--rail);
  }

  @media (max-width: 760px) {
    .menu-btn {
      display: inline-flex;
    }
  }
</style>
