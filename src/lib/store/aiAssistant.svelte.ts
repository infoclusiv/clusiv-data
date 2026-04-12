import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import { appState, getLogErrorContext, logClientEvent } from "$lib/store/appState.svelte";
import { showSnackbar } from "$lib/store/snackbar.svelte";
import type {
  AiChatMessage,
  AiChatRequest,
  AiChatRequestMessage,
  AiChatStreamEvent,
  AiConfig,
  AiConfigInput,
  AiKnowledgeContext,
} from "$lib/store/types";
import { buildAiKnowledgeContext } from "$lib/utils/aiContext";

interface AiConfigDraft extends AiConfigInput {
  apiKey: string;
}

function createDefaultAiConfig(): AiConfig {
  return {
    provider: "nvidia",
    apiBase: "https://integrate.api.nvidia.com/v1",
    model: "minimaxai/minimax-m2.7",
    temperature: 0.2,
    topP: 0.95,
    maxTokens: 8192,
    hasApiKey: false,
    apiKeyMask: null,
  };
}

function createDraftFromConfig(config: AiConfig): AiConfigDraft {
  return {
    provider: config.provider,
    apiBase: config.apiBase,
    model: config.model,
    temperature: config.temperature,
    topP: config.topP,
    maxTokens: config.maxTokens,
    apiKey: "",
  };
}

function createMessage(
  role: AiChatMessage["role"],
  content: string,
  status: AiChatMessage["status"],
  requestId: string | null,
): AiChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
    requestId,
  };
}

export const aiAssistantState = $state({
  config: createDefaultAiConfig(),
  draft: createDraftFromConfig(createDefaultAiConfig()),
  messages: [] as AiChatMessage[],
  lastContext: null as AiKnowledgeContext | null,
  includeCurrentCategory: true,
  isInitialized: false,
  isConfigOpen: false,
  isLoadingConfig: false,
  isSavingConfig: false,
  isTestingConfig: false,
  isStreaming: false,
  pendingRequestId: null as string | null,
  lastError: null as string | null,
});

let streamListenerPromise: Promise<UnlistenFn> | null = null;

function syncDraftFromConfig(config: AiConfig): void {
  aiAssistantState.draft = createDraftFromConfig(config);
}

function findAssistantMessageIndex(requestId: string): number {
  for (let index = aiAssistantState.messages.length - 1; index >= 0; index -= 1) {
    const message = aiAssistantState.messages[index];
    if (message.role === "assistant" && message.requestId === requestId) {
      return index;
    }
  }

  return -1;
}

function updateAssistantMessage(
  requestId: string,
  transform: (message: AiChatMessage) => AiChatMessage,
): void {
  const messageIndex = findAssistantMessageIndex(requestId);
  if (messageIndex < 0) {
    return;
  }

  const nextMessages = [...aiAssistantState.messages];
  nextMessages[messageIndex] = transform(nextMessages[messageIndex]);
  aiAssistantState.messages = nextMessages;
}

function clearStreamingState(requestId: string): void {
  if (aiAssistantState.pendingRequestId !== requestId) {
    return;
  }

  aiAssistantState.isStreaming = false;
  aiAssistantState.pendingRequestId = null;
}

function failPendingRequest(requestId: string, message: string): void {
  updateAssistantMessage(requestId, (assistantMessage) => ({
    ...assistantMessage,
    content: message,
    status: "error",
  }));
  aiAssistantState.lastError = message;
  clearStreamingState(requestId);
  showSnackbar(message, "error", 4200);
}

function handleAiStreamEvent(event: AiChatStreamEvent): void {
  if (!event.requestId) {
    return;
  }

  if (event.kind === "started") {
    aiAssistantState.lastError = null;
    return;
  }

  if (event.kind === "delta") {
    updateAssistantMessage(event.requestId, (assistantMessage) => ({
      ...assistantMessage,
      content: `${assistantMessage.content}${event.delta ?? ""}`,
      status: "streaming",
    }));
    return;
  }

  if (event.kind === "complete") {
    updateAssistantMessage(event.requestId, (assistantMessage) => ({
      ...assistantMessage,
      content: assistantMessage.content.trim().length > 0
        ? assistantMessage.content
        : (event.message?.trim() || "No se recibió contenido del modelo."),
      status: assistantMessage.content.trim().length > 0 || Boolean(event.message?.trim())
        ? "done"
        : "error",
    }));
    clearStreamingState(event.requestId);
    return;
  }

  failPendingRequest(
    event.requestId,
    event.message?.trim() || "La respuesta del proveedor AI falló antes de completarse.",
  );
}

async function ensureStreamListener(): Promise<void> {
  if (!streamListenerPromise) {
    streamListenerPromise = listen<AiChatStreamEvent>("ai-chat-stream", (event) => {
      handleAiStreamEvent(event.payload);
    });
  }

  await streamListenerPromise;
}

function getDraftPayload(): AiConfigInput {
  const apiKey = aiAssistantState.draft.apiKey.trim();

  return {
    provider: aiAssistantState.draft.provider,
    apiBase: aiAssistantState.draft.apiBase.trim(),
    model: aiAssistantState.draft.model.trim(),
    temperature: Number(aiAssistantState.draft.temperature),
    topP: Number(aiAssistantState.draft.topP),
    maxTokens: Number(aiAssistantState.draft.maxTokens),
    apiKey: apiKey.length > 0 ? apiKey : undefined,
  };
}

function getConversationMessages(nextUserContent: string): AiChatRequestMessage[] {
  const history = aiAssistantState.messages
    .filter((message) => message.status !== "error")
    .filter((message) => message.content.trim().length > 0)
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  return [
    ...history,
    {
      role: "user",
      content: nextUserContent,
    },
  ];
}

function buildRetrievalQuery(nextUserContent: string): string {
  const previousUserMessages = aiAssistantState.messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content.trim())
    .filter((message) => message.length > 0);

  return [...previousUserMessages, nextUserContent].join("\n");
}

export async function loadAiConfig(): Promise<void> {
  aiAssistantState.isLoadingConfig = true;
  aiAssistantState.lastError = null;

  logClientEvent({
    source: "ai-assistant",
    action: "load_ai_config_started",
    message: "Loading AI assistant configuration from the backend.",
  });

  try {
    const config = await invoke<AiConfig>("get_ai_config");
    aiAssistantState.config = config;
    syncDraftFromConfig(config);
    aiAssistantState.isInitialized = true;

    logClientEvent({
      source: "ai-assistant",
      action: "load_ai_config_completed",
      message: "AI assistant configuration loaded.",
      context: {
        provider: config.provider,
        model: config.model,
        hasApiKey: config.hasApiKey,
      },
    });
  } catch (error) {
    aiAssistantState.lastError = error instanceof Error
      ? error.message
      : "No se pudo cargar la configuración del asistente.";

    logClientEvent({
      level: "error",
      source: "ai-assistant",
      action: "load_ai_config_failed",
      message: "Failed to load AI assistant configuration.",
      context: {
        error: getLogErrorContext(error),
      },
    });

    showSnackbar(aiAssistantState.lastError, "error");
    throw error;
  } finally {
    aiAssistantState.isLoadingConfig = false;
  }
}

export async function initializeAiAssistant(force = false): Promise<void> {
  await ensureStreamListener();

  if (aiAssistantState.isLoadingConfig) {
    return;
  }

  if (aiAssistantState.isInitialized && !force) {
    return;
  }

  await loadAiConfig();
}

export function openAiConfig(): void {
  syncDraftFromConfig(aiAssistantState.config);
  aiAssistantState.isConfigOpen = true;
}

export function closeAiConfig(): void {
  aiAssistantState.isConfigOpen = false;
}

export function resetAiConversation(): void {
  if (aiAssistantState.isStreaming) {
    return;
  }

  aiAssistantState.messages = [];
  aiAssistantState.lastContext = null;
  aiAssistantState.lastError = null;
}

export async function saveAiConfig(): Promise<void> {
  if (aiAssistantState.isSavingConfig) {
    return;
  }

  aiAssistantState.isSavingConfig = true;
  aiAssistantState.lastError = null;

  try {
    const config = await invoke<AiConfig>("save_ai_config", {
      input: getDraftPayload(),
    });

    aiAssistantState.config = config;
    syncDraftFromConfig(config);
    aiAssistantState.isInitialized = true;
    aiAssistantState.isConfigOpen = false;
    showSnackbar("Configuración del asistente guardada.", "success");
  } catch (error) {
    aiAssistantState.lastError = error instanceof Error
      ? error.message
      : "No se pudo guardar la configuración del asistente.";
    showSnackbar(aiAssistantState.lastError, "error");
    throw error;
  } finally {
    aiAssistantState.isSavingConfig = false;
  }
}

export async function testAiConfig(): Promise<void> {
  if (aiAssistantState.isTestingConfig) {
    return;
  }

  aiAssistantState.isTestingConfig = true;

  try {
    const message = await invoke<string>("test_ai_config", {
      input: getDraftPayload(),
    });
    showSnackbar(message, "success", 2600);
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : "No se pudo validar la conexión con NVIDIA.",
      "error",
    );
    throw error;
  } finally {
    aiAssistantState.isTestingConfig = false;
  }
}

export async function sendAiMessage(content: string): Promise<void> {
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0 || aiAssistantState.isStreaming) {
    return;
  }

  if (!appState.appData) {
    showSnackbar("Los datos de la app todavía no están listos.", "error");
    return;
  }

  if (!aiAssistantState.config.hasApiKey) {
    showSnackbar("Configura primero la API key de NVIDIA.", "error");
    openAiConfig();
    return;
  }

  if (aiAssistantState.config.model.trim().length === 0) {
    showSnackbar("Configura un modelo antes de enviar mensajes.", "error");
    openAiConfig();
    return;
  }

  await ensureStreamListener();

  const requestId = crypto.randomUUID();
  const retrievalQuery = buildRetrievalQuery(trimmedContent);
  const context = buildAiKnowledgeContext(
    appState.appData,
    retrievalQuery,
    aiAssistantState.includeCurrentCategory ? appState.currentCategoryId : null,
  );

  const request: AiChatRequest = {
    requestId,
    messages: getConversationMessages(trimmedContent),
    context,
  };

  aiAssistantState.messages = [
    ...aiAssistantState.messages,
    createMessage("user", trimmedContent, "done", null),
    createMessage("assistant", "", "streaming", requestId),
  ];
  aiAssistantState.lastContext = context;
  aiAssistantState.lastError = null;
  aiAssistantState.isStreaming = true;
  aiAssistantState.pendingRequestId = requestId;

  logClientEvent({
    source: "ai-assistant",
    action: "send_message_started",
    message: "Sending grounded AI assistant request.",
    context: {
      requestId,
      evidenceCount: context.summary.evidenceCount,
      includeCurrentCategory: aiAssistantState.includeCurrentCategory,
      currentCategoryId: appState.currentCategoryId,
    },
  });

  try {
    await invoke("start_ai_chat_stream", { request });
  } catch (error) {
    logClientEvent({
      level: "error",
      source: "ai-assistant",
      action: "send_message_failed",
      message: "Failed to start the AI chat stream.",
      context: {
        requestId,
        error: getLogErrorContext(error),
      },
    });

    failPendingRequest(
      requestId,
      error instanceof Error ? error.message : "No se pudo iniciar la consulta al asistente.",
    );
  }
}