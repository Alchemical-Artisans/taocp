<script lang="ts">
  import { base } from "$app/paths"
</script>

<a class="topbar" href="{base}/">
  <span class="wordmark">TAOCP Companion</span>
</a>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 24px;
    height: 52px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 5;
    color: inherit;
    text-decoration: none;
  }
  .wordmark {
    font-family: "Libre Franklin", ui-sans-serif, system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.98rem;
    color: var(--ink);
  }
</style>
