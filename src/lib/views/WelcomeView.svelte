<script lang="ts">
  import { LayoutDashboard } from "lucide-svelte";
</script>

<div class="page-panel flex h-full flex-1 items-center justify-center p-10">
  <div class="max-w-md text-center">
    <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <LayoutDashboard size={38} />
    </div>
    <h1 class="text-2xl font-semibold text-slate-900">Selecciona una opción del menú</h1>
    <p class="mt-3 text-sm leading-relaxed text-slate-600">
      La navegación lateral mantiene la misma jerarquía de categorías y notebooks de la app Flet original.
    </p>
  </div>
</div>