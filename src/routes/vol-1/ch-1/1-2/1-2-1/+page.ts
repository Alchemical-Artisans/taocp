import type { PageLoad } from "./$types"

export const load: PageLoad = () => {
  return {
    onThisPage: [
      { id: "closed-forms", label: "Closed Forms" },
      { id: "extended-euclids-algorithm", label: "Extended Euclid's Algorithm" },
    ],
  }
}
