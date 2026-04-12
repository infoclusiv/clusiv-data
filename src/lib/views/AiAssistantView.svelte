<script lang="ts">
  import { onMount } from "svelte";
  import {
    Bot,
    Database,
    KeyRound,
    RefreshCw,
    SendHorizontal,
    Settings2,
    Sparkles,
    Trash2,
  } from "lucide-svelte";

  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import {
    aiAssistantState,
    closeAiConfig,
    initializeAiAssistant,
    openAiConfig,
    resetAiConversation,
    saveAiConfig,
    sendAiMessage,
    testAiConfig,
  } from "$lib/store/aiAssistant.svelte";
  import { appState } from "$lib/store/appState.svelte";
  import { getCategoryBreadcrumb } from "$lib/utils/categoryUtils";

  let composerText = $state("");

  const providerOptions = [{ value: "nvidia", label: "NVIDIA" }];

  const currentCategoryBreadcrumb = $derived(
    appState.appData && appState.currentCategoryId
      ? getCategoryBreadcrumb(appState.appData, appState.currentCategoryId)
      : null,
  );

  const canSend = $derived(
    composerText.trim().length > 0
      && aiAssistantState.isInitialized
      && aiAssistantState.config.hasApiKey
      && aiAssistantState.config.model.trim().length > 0
      && !aiAssistantState.isStreaming,
  );

  onMount(() => {
    void initializeAiAssistant();
  });

  function handleSubmit(): void {
    const trimmed = composerText.trim();
    if (!trimmed) {
      return;
    }

    composerText = "";
    void sendAiMessage(trimmed);
  }

  function handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getBubbleClasses(role: "user" | "assistant", status: "done" | "streaming" | "error"): string {
    if (role === "user") {
      return "ml-auto bg-brand-700 text-white shadow-soft";
    }

    if (status === "error") {
      return "mr-auto border border-red-200 bg-red-50 text-red-700";
    }

    return "mr-auto border border-white/70 bg-white/85 text-slate-800 shadow-soft";
  }
</script>

{#if appState.appData}
  <div class="page-panel flex h-full flex-1 flex-col overflow-hidden">
    <div class="border-b border-slate-200/70 px-8 py-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="section-label">Asistente</p>
          <h1 class="mt-2 text-3xl font-semibold text-slate-900">Asistente AI</h1>
          <p class="mt-2 max-w-3xl text-sm text-slate-500">
            Conversa con tu base de conocimiento usando NVIDIA. El asistente debe responder solo con la información guardada en tus categorías, subcategorías, notas, tareas, enlaces y textos rápidos.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            class="btn-ghost bg-white/75"
            onclick={() => void initializeAiAssistant(true)}
            disabled={aiAssistantState.isLoadingConfig || aiAssistantState.isSavingConfig || aiAssistantState.isTestingConfig}
          >
            <RefreshCw size={16} class={aiAssistantState.isLoadingConfig ? "animate-spin" : ""} />
            Actualizar
          </button>

          <button class="btn-ghost bg-white/75" onclick={openAiConfig}>
            <Settings2 size={16} />
            Configuración
          </button>

          <button
            class="btn-ghost bg-white/75"
            onclick={resetAiConversation}
            disabled={aiAssistantState.messages.length === 0 || aiAssistantState.isStreaming}
          >
            <Trash2 size={16} />
            Limpiar chat
          </button>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <span class="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          {aiAssistantState.config.provider}
        </span>
        <span class="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          {aiAssistantState.config.model || "Modelo sin definir"}
        </span>
        <span class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm ${aiAssistantState.config.hasApiKey ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {aiAssistantState.config.hasApiKey ? "API key lista" : "Falta API key"}
        </span>
        {#if currentCategoryBreadcrumb}
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
            Contexto actual: {currentCategoryBreadcrumb}
          </span>
        {/if}
      </div>

      {#if !aiAssistantState.config.hasApiKey || aiAssistantState.config.model.trim().length === 0}
        <div class="mt-5 rounded-[1.4rem] border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-sm text-amber-800">
          Configura tu API key de NVIDIA y el modelo antes de enviar la primera consulta.
        </div>
      {/if}
    </div>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div class="flex min-h-0 flex-1 flex-col border-b border-slate-200/70 lg:border-b-0 lg:border-r">
        <div class="flex-1 overflow-y-auto px-8 py-6">
          {#if aiAssistantState.isLoadingConfig && !aiAssistantState.isInitialized}
            <div class="card border-dashed p-10 text-center text-sm text-slate-500">
              Cargando la configuración del asistente...
            </div>
          {:else if aiAssistantState.messages.length === 0}
            <div class="grid gap-4 lg:grid-cols-3">
              <div class="card p-5">
                <p class="section-label">Grounding</p>
                <p class="mt-3 text-lg font-semibold text-slate-900">Solo tus datos</p>
                <p class="mt-2 text-sm leading-relaxed text-slate-600">
                  El asistente recibe un contexto estructurado con jerarquías, breadcrumbs y fragmentos relevantes recuperados desde tu conocimiento guardado.
                </p>
              </div>

              <div class="card p-5">
                <p class="section-label">Jerarquía</p>
                <p class="mt-3 text-lg font-semibold text-slate-900">Entiende categorías y subcategorías</p>
                <p class="mt-2 text-sm leading-relaxed text-slate-600">
                  La recuperación incluye el árbol principal, la categoría activa y la ruta de cada evidencia para que el modelo distinga contexto y relación entre elementos.
                </p>
              </div>

              <div class="card p-5">
                <p class="section-label">Configuración</p>
                <p class="mt-3 text-lg font-semibold text-slate-900">Cambia API key y modelo</p>
                <p class="mt-2 text-sm leading-relaxed text-slate-600">
                  Puedes actualizar desde la interfaz la API key de NVIDIA, el modelo, la URL base y los parámetros de generación sin tocar archivos manualmente.
                </p>
              </div>
            </div>
          {:else}
            <div class="space-y-4">
              {#each aiAssistantState.messages as message}
                <div class={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 ${getBubbleClasses(message.role, message.status)}`}>
                    <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                      {#if message.role === "assistant"}
                        <Bot size={14} />
                        Asistente AI
                      {:else}
                        <Sparkles size={14} />
                        Tú
                      {/if}
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </div>

                    <p class="whitespace-pre-wrap text-sm leading-relaxed">{message.content || (message.status === "streaming" ? "Pensando..." : "")}</p>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="border-t border-slate-200/70 px-8 py-5">
          {#if currentCategoryBreadcrumb}
            <label class="mb-3 flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                bind:checked={aiAssistantState.includeCurrentCategory}
                class="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-200"
              />
              Incluir la categoría actual como contexto adicional
            </label>
          {/if}

          <div class="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-3 shadow-sm">
            <textarea
              bind:value={composerText}
              rows="4"
              placeholder="Haz una pregunta sobre tu conocimiento guardado..."
              class="input-base min-h-[7rem] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
              disabled={aiAssistantState.isStreaming || !aiAssistantState.isInitialized}
              onkeydown={handleComposerKeydown}
            ></textarea>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-2 pt-3">
              <p class="text-xs text-slate-500">
                El modelo debe responder solo desde el contexto recuperado. Si no encuentra respaldo suficiente, debe decirlo.
              </p>

              <button class="btn-primary" onclick={handleSubmit} disabled={!canSend}>
                <SendHorizontal size={16} />
                {aiAssistantState.isStreaming ? "Respondiendo..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside class="w-full shrink-0 overflow-y-auto bg-slate-50/35 px-6 py-6 lg:w-[23rem]">
        <div class="card p-5">
          <p class="section-label">Contexto Recuperado</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div class="rounded-2xl bg-white/80 p-4">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Database size={16} />
                Cobertura
              </div>
              <p class="mt-2 text-sm text-slate-600">
                {aiAssistantState.lastContext?.summary.categoryCount ?? Object.keys(appState.appData.__SYSTEM_CATEGORIES__).length} categorías
                • {aiAssistantState.lastContext?.summary.itemCount ?? appState.appData.__SYSTEM_TASKS__.length} notas y tareas
              </p>
            </div>

            <div class="rounded-2xl bg-white/80 p-4">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <KeyRound size={16} />
                Evidencias
              </div>
              <p class="mt-2 text-sm text-slate-600">
                {aiAssistantState.lastContext?.summary.evidenceCount ?? 0} fragmentos seleccionados para la última consulta.
              </p>
            </div>
          </div>
        </div>

        {#if aiAssistantState.lastContext?.activeCategory}
          <div class="card mt-4 p-5">
            <p class="section-label">Categoría Activa</p>
            <p class="mt-3 text-sm font-semibold text-slate-900">{aiAssistantState.lastContext.activeCategory.title}</p>
            <p class="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {aiAssistantState.lastContext.activeCategory.breadcrumb}
            </p>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">
              {aiAssistantState.lastContext.activeCategory.preview}
            </p>
          </div>
        {/if}

        <div class="card mt-4 p-5">
          <p class="section-label">Evidencias Relevantes</p>
          {#if aiAssistantState.lastContext && aiAssistantState.lastContext.evidence.length > 0}
            <div class="mt-4 space-y-3">
              {#each aiAssistantState.lastContext.evidence as entry}
                <div class="rounded-2xl bg-white/80 p-4">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-900">{entry.title}</p>
                    <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {entry.type}
                    </span>
                  </div>

                  <p class="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {entry.breadcrumb}
                  </p>

                  <p class="mt-2 text-sm leading-relaxed text-slate-600">{entry.preview}</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-4 text-sm leading-relaxed text-slate-500">
              Aquí verás los fragmentos recuperados desde tu conocimiento para la última pregunta enviada.
            </p>
          {/if}
        </div>

        <div class="card mt-4 p-5">
          <p class="section-label">Jerarquía Enviada</p>
          {#if aiAssistantState.lastContext && aiAssistantState.lastContext.hierarchyOutline.length > 0}
            <div class="mt-4 space-y-2">
              {#each aiAssistantState.lastContext.hierarchyOutline as entry}
                <div class="rounded-2xl bg-white/80 px-4 py-3">
                  <p class="text-sm font-semibold text-slate-800" style={`padding-left: ${entry.depth * 0.55}rem`}>
                    {entry.name}
                  </p>
                  <p class="mt-1 text-xs text-slate-500">{entry.childCount} subcategorías • {entry.itemCount} items • {entry.linkCount} enlaces</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-4 text-sm leading-relaxed text-slate-500">
              El árbol relevante aparecerá aquí una vez envíes una consulta.
            </p>
          {/if}
        </div>
      </aside>
    </div>
  </div>

  <Modal
    open={aiAssistantState.isConfigOpen}
    title="Configuración del Asistente AI"
    onclose={closeAiConfig}
    widthClass="max-w-4xl"
  >
    {#snippet children()}
      <div class="grid gap-4 md:grid-cols-2">
        <Select
          label="Proveedor"
          bind:value={aiAssistantState.draft.provider}
          options={providerOptions}
          disabled={true}
        />

        <Input
          label="Modelo"
          bind:value={aiAssistantState.draft.model}
          placeholder="minimaxai/minimax-m2.7"
          autofocus={true}
        />

        <Input
          label="API Base"
          bind:value={aiAssistantState.draft.apiBase}
          placeholder="https://integrate.api.nvidia.com/v1"
        />

        <Input
          label="API Key de NVIDIA"
          bind:value={aiAssistantState.draft.apiKey}
          type="password"
          placeholder={aiAssistantState.config.apiKeyMask ?? "Pega aquí tu NVIDIA API key"}
        />

        <div class="flex flex-col gap-1.5">
          <label class="section-label" for="ai-temperature">Temperature</label>
          <input
            id="ai-temperature"
            type="number"
            min="0"
            max="2"
            step="0.05"
            bind:value={aiAssistantState.draft.temperature}
            class="input-base"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="section-label" for="ai-top-p">Top P</label>
          <input
            id="ai-top-p"
            type="number"
            min="0"
            max="1"
            step="0.01"
            bind:value={aiAssistantState.draft.topP}
            class="input-base"
          />
        </div>

        <div class="flex flex-col gap-1.5 md:col-span-2">
          <label class="section-label" for="ai-max-tokens">Max Tokens</label>
          <input
            id="ai-max-tokens"
            type="number"
            min="1"
            max="8192"
            step="1"
            bind:value={aiAssistantState.draft.maxTokens}
            class="input-base"
          />
        </div>
      </div>

      <div class="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Si dejas la API key vacía, la app conservará la que ya esté guardada. La clave se almacena en un archivo local separado de tu base principal de conocimiento.
      </div>
    {/snippet}

    {#snippet actions()}
      <Button onclick={() => void testAiConfig()} disabled={aiAssistantState.isTestingConfig || aiAssistantState.isSavingConfig}>
        {aiAssistantState.isTestingConfig ? "Probando..." : "Probar conexión"}
      </Button>
      <Button onclick={closeAiConfig} disabled={aiAssistantState.isSavingConfig}>Cancelar</Button>
      <Button variant="primary" onclick={() => void saveAiConfig()} disabled={aiAssistantState.isSavingConfig || aiAssistantState.isTestingConfig}>
        {aiAssistantState.isSavingConfig ? "Guardando..." : "Guardar configuración"}
      </Button>
    {/snippet}
  </Modal>
{/if}