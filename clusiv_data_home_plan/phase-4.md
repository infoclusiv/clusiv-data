# Phase 4 — Replace the welcome view with the minimal editable motivation screen

## Single objective

Redesign `WelcomeView` into a white, minimal home screen that displays the saved motivational text and exposes one small edit button in a corner.

## Expected behavior

- The home screen is visually minimal: white background, centered motivational text, and one minimal edit button in a corner.
- The old welcome dashboard icon and instructional copy are removed.
- The motivational text supports multiline content and preserves line breaks.
- The text uses an elegant, minimal, epic style. Prefer built-in/system-safe styling such as `font-serif italic`, large size, balanced max width, neutral color, and generous line-height. Do not add external fonts.
- Clicking the edit button opens an editor for changing the text.
- Saving the editor calls the Phase 2 store action and persists the text.
- Empty text is allowed if the user wants a truly blank motivational screen; do not replace empty text with extra helper copy on the home screen.

## Success criteria

- `src/lib/views/WelcomeView.svelte` reads the home text from `appState.appData.__SYSTEM_HOME_TEXT__`.
- The screen no longer imports or renders `LayoutDashboard`.
- Only the motivational text and one edit control are visible in the resting home state.
- The edit control is visually small and positioned in a corner, for example top-right.
- The editor uses existing UI primitives where possible: `Modal`, `Input`, `Button`, and `showSnackbar`.
- Saving updates the text through `saveHomeText()` or the equivalent Phase 2 action.
- Save success and failure are communicated through the existing snackbar pattern.
- `pnpm check` passes.
- Manual restart confirms the edited text persists.

## How to verify

1. Inspect current `src/lib/views/WelcomeView.svelte` before editing.
2. Inspect reusable UI components before creating anything new:
   - `src/lib/components/ui/Modal.svelte`
   - `src/lib/components/ui/Input.svelte`
   - `src/lib/components/ui/Button.svelte`
   - `src/lib/store/snackbar.svelte`
3. Implement the minimal home UI.
4. Run:
   ```bash
   pnpm check
   ```
5. Manual UI verification:
   - Start the app and confirm the first screen is white/minimal.
   - Confirm the old welcome icon/copy is gone.
   - Confirm only text and the small edit button appear in the resting state.
   - Edit the text with multiple lines.
   - Save, close, and confirm line breaks display correctly.
   - Restart/reload the app and confirm the edited text remains.
   - Save an empty string and confirm the home screen can be blank except for the edit button.
6. Regression verification:
   - Navigate to other sidepanel sections and back home.
   - Confirm other views still render normally inside `App.svelte`.

## Observable failure signals

- The old `Selecciona una opción del menú` content still appears.
- The home screen has cards, icons, headers, panels, lists, or other non-requested elements in its resting state.
- Text loses line breaks or collapses into one line.
- Editing appears to work but the value is lost after restart.
- Empty text is rejected even though the user requested arbitrary text.
- The edit modal cannot be closed with Escape/backdrop if using the existing `Modal`.
- Saving throws, but no snackbar/error is shown.
- The page scrolls unexpectedly or the text overflows outside the available viewport.

## Files/components involved

- `src/lib/views/WelcomeView.svelte`
- `src/lib/store/appState.svelte.ts`
- Optional if a separate dialog is cleaner and still minimal:
  - `src/lib/components/dialogs/HomeTextDialog.svelte`
- Existing UI primitives:
  - `src/lib/components/ui/Modal.svelte`
  - `src/lib/components/ui/Input.svelte`
  - `src/lib/components/ui/Button.svelte`
  - `src/lib/store/snackbar.svelte`

## Preconditions before implementation

- Phase 1 persisted home text is present in `AppData`.
- Phase 2 save action exists and is verified.
- Phase 3 home navigation is verified.
- Confirm `WelcomeView.svelte` is still rendered for `currentView === "welcome"` in `src/App.svelte`.
- Confirm no design system rule requires the old `page-panel` visual treatment on all views.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- `WelcomeView.svelte` has been replaced by a different home component.
- Existing UI primitives cannot support editing without a larger refactor.
- The app requires all views to use a specific panel wrapper that prevents a white/minimal screen.
- The product decision changes from “white screen + text + one edit button” to a richer dashboard.
