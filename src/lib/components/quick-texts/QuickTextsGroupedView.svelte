<script lang="ts">
  import QuickTextGroupCard from "$lib/components/quick-texts/QuickTextGroupCard.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";

  interface Props {
    groups: QuickTextGroup[];
    quickTexts: QuickText[];
    oncopy: (quickText: QuickText) => void;
    onedit: (quickText: QuickText) => void;
    ondelete: (quickText: QuickText) => void;
    oneditgroup: (group: QuickTextGroup) => void;
    ondeletegroup: (group: QuickTextGroup) => void;
  }

  interface GroupSection {
    group: QuickTextGroup | null;
    texts: QuickText[];
    virtual: boolean;
  }

  let { groups, quickTexts, oncopy, onedit, ondelete, oneditgroup, ondeletegroup }: Props = $props();

  function sortGroups(items: QuickTextGroup[]): QuickTextGroup[] {
    return items
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  }

  function sortTexts(items: QuickText[]): QuickText[] {
    return items
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order || left.title.localeCompare(right.title));
  }

  const sections = $derived.by<GroupSection[]>(() => {
    const sortedGroups = sortGroups(groups);
    const sortedTexts = sortTexts(quickTexts);

    const byGroupId = new Map<string, QuickText[]>();
    for (const quickText of sortedTexts) {
      if (!quickText.group_id) {
        continue;
      }

      const existing = byGroupId.get(quickText.group_id) ?? [];
      existing.push(quickText);
      byGroupId.set(quickText.group_id, existing);
    }

    const nextSections: GroupSection[] = sortedGroups.map((group) => ({
      group,
      texts: byGroupId.get(group.id) ?? [],
      virtual: false,
    }));

    const ungroupedTexts = sortedTexts.filter((quickText) => quickText.group_id === null);
    if (ungroupedTexts.length > 0) {
      nextSections.push({
        group: null,
        texts: ungroupedTexts,
        virtual: true,
      });
    }

    return nextSections;
  });
</script>

<div class="grid gap-4">
  {#each sections as section, index (section.group?.id ?? `virtual-${index}`)}
    <QuickTextGroupCard
      group={section.group}
      texts={section.texts}
      virtual={section.virtual}
      {oncopy}
      {onedit}
      {ondelete}
      {oneditgroup}
      {ondeletegroup}
    />
  {/each}
</div>
