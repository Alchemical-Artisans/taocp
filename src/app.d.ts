// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {
      /** Section headings on the current page, listed in the right rail's "On this page". */
      onThisPage?: { id: string; label: string }[]
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
