# Project Guidelines & Standing Rules

## UI Spacing System Standing Rule
*(Applies to ALL current and future UI changes in this project)*

Always use proper, consistent spacing wherever necessary. Never leave elements flush against their container edges or against each other.

- **Spacing Scale**: Use only the 4px spacing scale from the shared tokens (`--space-1`: 4px, `--space-2`: 8px, `--space-3`: 12px, `--space-4`: 16px, `--space-6`: 24px, `--space-8`: 32px). No arbitrary values like 5px, 7px or 13px.
- **Containers**: Every container (panel, card, modal, dropdown, list, form) gets internal padding. Default is 16px (`p-4`), or 12px (`p-3`) for compact elements.
- **Flex & Grid Gaps**: Use `gap` on flex/grid parents for spacing between siblings instead of one-off margins on children (`gap-2`, `gap-3`, `gap-4`).
- **Buttons and Inputs**: Minimum 36px height (`h-9`), 8px 12px padding (`px-3 py-2`), 8px between icon and label (`gap-2`), 8px between adjacent buttons.
- **List and Nav Items**: 8px 12px padding (`px-3 py-2`) with 4px between items (`gap-1` or `space-y-1`). List rows use `px-4 py-3`.
- **Sections**: 16-24px between sections, 8px between heading and content.
- **Icons**: Icons next to text need an 8-12px gap (`gap-2` or `gap-3`) and must be vertically centered.
- **Input Icons**: Icons inside inputs are absolutely positioned (e.g. `left-3`), with the input padded (e.g. `pl-9`) so text never overlaps them.
- **Micro-elements**: Empty states, error banners, toasts, badges, dropdowns and tooltips all need padding and breathing room.
- **Typography & Boundaries**: Text must never touch a border or the edge of its container. Uppercase headings use 11px font with letter-spacing `.06em` (`text-[11px] font-bold tracking-[0.06em] uppercase`). Use `min-w-0` on flex children and `truncate` for long text.
- **Responsiveness**: Check layouts at 1280px width and below for overflow or collisions; ensure no horizontal scrolling.
- **Colors & Logic**: Do not change colors, functionality, or data logic while adjusting spacing unless asked.
- **Tailwind v4 Layering**: Never write unlayered CSS resets (such as `* { margin: 0; padding: 0 }`) outside `@layer base`, as unlayered rules override Tailwind v4 utility classes.
