import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync(new URL("../views/TranscriptionView.svelte", import.meta.url), "utf8");
const backend = readFileSync(new URL("../../../src-tauri/src/commands/transcription.rs", import.meta.url), "utf8");
const registry = readFileSync(new URL("../../../src-tauri/src/lib.rs", import.meta.url), "utf8");

for (const required of [
  'sourceMode = $state<"file" | "x">',
  'Enlace de X',
  '"transcribe_x_audio"',
  '"transcribe_audio"',
  'xUrl.trim()',
  'x-transcription-stage',
]) {
  assert.ok(view.includes(required), `Missing X and local transcribe UI functionality: ${required}`);
}
for (const required of [
  'fn parse_x_post_url(',
  'fn download_x_mp3(',
  'pub async fn transcribe_x_audio(',
  'transcribe_blocking(',
  'yt_dlp',
  '"ffmpeg"',
]) {
  assert.ok(backend.includes(required), `Missing X downloader and WhisperX integration: ${required}`);
}
assert.ok(registry.includes("commands::transcription::transcribe_audio,"));
assert.ok(registry.includes("commands::transcription::transcribe_x_audio,"));
assert.ok(backend.includes("fn x_urls_are_strictly_validated_and_tracking_is_stripped"));
console.log("PASS both local-file and X-link transcription controls, handler registration and URL validation");
