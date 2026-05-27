# Phase 3 — Make the sidebar title clickable as the home entry point

## Single objective

Turn the `Clusiv Data` text at the top of the sidepanel into a clickable control that navigates to the home screen.

## Expected behavior

- The title visually remains the `Clusiv Data` brand at the top of the sidepanel.
- Clicking the title navigates to the home/welcome screen from any current view.
- The button is accessible by keyboard and has a useful label/title.
- Existing sidebar buttons, resize behavior, and layout remain unchanged.

## Success criteria

- `src/lib/components/layout/Sidebar.svelte` imports `showWelcome` from the app state store.
- The current `<p>` brand text is replaced with a semantic `<button type="button">` or equivalent accessible control.
- The clickable title preserves the current visual weight, spacing, tracking, and brand color as closely as possible.
- Clicking it calls `showWelcome()`.
- `pnpm check` passes.
- Manual verification confirms navigation to home from categories, board, flows, search, logs, quick texts, backups, item editor, and flow editor where applicable.

## How to verify

1. Inspect `src/lib/components/layout/Sidebar.svelte` before editing.
2. Confirm the current brand text is near the top of the `<aside>` and currently non-clickable.
3. Make the smallest possible change to make it clickable.
4. Run:
   ```bash
   pnpm check
   ```
5. Manual UI verification:
   - Open the app.
   - Navigate to several existing sections.
   - Click `Clusiv Data` each time.
   - Confirm `WelcomeView` appears and the sidebar width/resize behavior still works.
6. Keyboard verification:
   - Tab to the title button.
   - Press Enter or Space.
   - Confirm it navigates home.

## Observable failure signals

- The title is still rendered as plain text and cannot receive focus.
- Clicking the title does nothing or selects a category instead of home.
- Sidebar resize handle stops responding.
- The title button gets default browser button styling that breaks the minimal sidebar design.
- `showWelcome` is imported but unused or incorrectly named.
- Navigation creates unexpected errors when leaving editor views.

## Files/components involved

- `src/lib/components/layout/Sidebar.svelte`
- Indirect dependency: `src/lib/store/appState.svelte.ts` from Phase 2.

## Preconditions before implementation

- Phase 2 is implemented and verified.
- Confirm `showWelcome()` is exported from `appState.svelte.ts`.
- Confirm `Sidebar.svelte` is still the component that renders the sidepanel title.
- Confirm no separate brand/header component has replaced the title.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- `Clusiv Data` is no longer rendered by `Sidebar.svelte`.
- The app now has multiple sidebars or a new navigation shell that changes where the brand lives.
- `showWelcome()` no longer exists or home navigation uses a different route API.
- Making the title clickable would conflict with an existing drag/resize/keyboard behavior.
