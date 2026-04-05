export type SnackbarTone = "default" | "success" | "error";

export const snackbarState = $state({
  message: "",
  tone: "default" as SnackbarTone,
  visible: false,
});

let timer: ReturnType<typeof setTimeout> | null = null;

export function showSnackbar(
  message: string,
  tone: SnackbarTone = "default",
  duration = 3000,
): void {
  if (timer) {
    clearTimeout(timer);
  }

  snackbarState.message = message;
  snackbarState.tone = tone;
  snackbarState.visible = true;

  timer = setTimeout(() => {
    snackbarState.visible = false;
    timer = null;
  }, duration);
}

export function hideSnackbar(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  snackbarState.visible = false;
}