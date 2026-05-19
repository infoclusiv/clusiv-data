<script lang="ts">
  import QuickTextRow from "$lib/components/quick-texts/QuickTextRow.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  interface Props {
    groups: QuickTextGroup[];
    quickTexts: QuickText[];
    oncopy: (quickText: QuickText) => void;
    onedit: (quickText: QuickText) => void;
    ondelete: (quickText: QuickText) => void;
  }

  interface ListRow {
    quickText: QuickText;
    groupName: string;
  }

  let { groups, quickTexts, oncopy, onedit, ondelete }: Props = $props();

  const rows = $derived.by<ListRow[]>(() => {
    const groupOrder = new Map<string, number>();
    const groupNames = new Map<string, string>();

    groups.forEach((group, index) => {
      groupOrder.set(group.id, group.sort_order ?? index);
      groupNames.set(group.id, group.name);
    });

    return quickTexts
      .slice()
      .sort((left, right) => {
        const leftOrder = left.group_id ? (groupOrder.get(left.group_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const rightOrder = right.group_id ? (groupOrder.get(right.group_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }

        return left.title.localeCompare(right.title);
      })
      .map((quickText) => ({
        quickText,
        groupName: quickText.group_id ? (groupNames.get(quickText.group_id) ?? "Textos sin grupo") : "Textos sin grupo",
      }));
  });
</script>

<div class="grid gap-3">
  {#each rows as row, index (row.quickText.id)}
    <QuickTextRow
      quickText={row.quickText}
      {index}
      groupName={row.groupName}
      showGroupLabel={true}
      oncopy={() => oncopy(row.quickText)}
      onedit={() => onedit(row.quickText)}
      ondelete={() => ondelete(row.quickText)}
    />
  {/each}
</div>
