import { mount } from "svelte";

import "./app.css";
import App from "./App.svelte";
import { getLogErrorContext, logClientEvent } from "$lib/store/appState.svelte";

window.addEventListener("error", (event) => {
  logClientEvent({
    level: "error",
    source: "window",
    action: "error",
    message: event.message || "Unhandled window error.",
    context: {
      filename: event.filename || null,
      lineno: event.lineno,
      colno: event.colno,
      error: getLogErrorContext(event.error),
    },
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logClientEvent({
    level: "error",
    source: "window",
    action: "unhandled_rejection",
    message: "Unhandled promise rejection.",
    context: {
      reason: getLogErrorContext(event.reason),
    },
  });
});

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;