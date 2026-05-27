# Phase 2 — Add home navigation and home text store actions

## Single objective

Make the existing `welcome` view behave as the app’s home destination in state management: startup should always land there, and the store should expose a safe action for updating the home text.

## Expected behavior

- After `initializeApp()` finishes, the first visible app section is always the home/welcome view.
- The app no longer auto-selects the `General` category on startup.
- Existing data load, normalization, sidebar width restoration, expanded category restoration, and automatic backup behavior remain intact.
- A store action can update the home text and persist it through the existing `mutateAppData()` / `persistData()` flow.

## Success criteria

- `initializeApp()` calls `showWelcome({ recordHistory: false })` after data load and automatic backup handling.
- Startup does not push anything into `navigationHistory`.
- `currentView` is `"welcome"` after initialization.
- `currentCategoryId` is `null` on the initial home screen.
- A new exported action, for example `saveHomeText(text: string): Promise<void>`, updates `appState.appData.__SYSTEM_HOME_TEXT__` and persists it.
- The store logs clear start/completion/failure events for saving the home text, following existing logging patterns.
- `pnpm check` passes.

## How to verify

1. Open `src/lib/store/appState.svelte.ts` and re-check:
   - `appState` default values.
   - `showWelcome()`.
   - `initializeApp()`.
   - `mutateAppData()` and `persistData()`.
2. Update only the navigation/store behavior needed for the home screen.
3. Run:
   ```bash
   pnpm check
   ```
4. Manual UI verification:
   - Start the app with existing categories present.
   - Confirm it opens to the home/welcome view, not the `General` category.
   - Navigate to a category, close/reopen or reload the app, and confirm it starts on home again.
5. Manual persistence verification:
   - Call/use the new save action from a temporary dev hook or later UI phase.
   - Confirm the new value reaches `data.json`.

## Observable failure signals

- App still starts on the `General` category.
- `navigationHistory` contains a startup route before the user navigates.
- Categories, flows, quick texts, or backups fail to load after startup changes.
- Automatic backup no longer runs or errors are no longer safely ignored.
- Saving home text throws `La aplicación todavía no cargó los datos.` when the app is already ready.
- Logs show navigation to category immediately after initialization.

## Files/components involved

- `src/lib/store/appState.svelte.ts`
- Indirectly affected by behavior: `src/App.svelte`, because it renders `WelcomeView` when `currentView === "welcome"`.

## Preconditions before implementation

- Phase 1 is implemented and verified.
- Confirm `showWelcome()` still exists and uses `view: "welcome"`.
- Confirm `initializeApp()` still selects `GENERAL_CATEGORY_ID` before this phase.
- Confirm `mutateAppData()` remains the correct way to update persisted app data.

## Stop conditions if the plan does not match the real codebase

Stop and report before coding if:

- The app has switched from store-driven views to a router or URL-based navigation.
- `initializeApp()` is no longer responsible for startup navigation.
- `welcome` is no longer a valid `AppView`.
- A different persistent settings/action layer already exists and should be used instead of `mutateAppData()`.
- Changing startup to home would break an explicit business rule found in the current code.
