<script lang="ts">
  import QuickTextGroupCard from "$lib/components/quick-texts/QuickTextGroupCard.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";
  import { getEffectiveQuickTextGroupIds } from "$lib/utils/categoryUtils";

  interface Props {
    groups: QuickTextGroup[];
    quickTexts: QuickText[];
    oncopy: (quickText: QuickText) => void;
    onedit: (quickText: QuickText) => void;
    ondelete: (quickText: QuickText) => void;
    oneditgroup: (group: QuickTextGroup) => void;
    ondeletegroup: (group: QuickTextGroup) => void;
    onmovegroup?: (group: QuickTextGroup, direction: "up" | "down") => void;
  }

  interface GroupSection {
    group: QuickTextGroup | null;
    texts: QuickText[];
    virtual: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }

  let { groups, quickTexts, oncopy, onedit, ondelete, oneditgroup, ondeletegroup, onmovegroup }: Props = $props();

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

  function splitSections(items: GroupSection[]): [GroupSection[], GroupSection[]] {
    return items.reduce<[GroupSection[], GroupSection[]]>(
      (columns, section, index) => {
        columns[index % 2].push(section);
        return columns;
      },
      [[], []],
    );
  }

  const sections = $derived.by<GroupSection[]>(() => {
    const sortedGroups = sortGroups(groups);
    const sortedTexts = sortTexts(quickTexts);
    const validGroupIds = new Set(sortedGroups.map((group) => group.id));

    const byGroupId = new Map<string, QuickText[]>();
    const ungroupedTexts: QuickText[] = [];

    for (const quickText of sortedTexts) {
      const groupIds = getEffectiveQuickTextGroupIds(quickText, validGroupIds);

      if (groupIds.length === 0) {
        ungroupedTexts.push(quickText);
        continue;
      }

      for (const groupId of groupIds) {
        const existing = byGroupId.get(groupId) ?? [];
        existing.push(quickText);
        byGroupId.set(groupId, existing);
      }
    }

    const nextSections: GroupSection[] = sortedGroups.map((group, index) => ({
      group,
      texts: byGroupId.get(group.id) ?? [],
      virtual: false,
      canMoveUp: index > 0,
      canMoveDown: index < sortedGroups.length - 1,
    }));

    if (ungroupedTexts.length > 0) {
      nextSections.push({
        group: null,
        texts: ungroupedTexts,
        virtual: true,
        canMoveUp: false,
        canMoveDown: false,
      });
    }

    return nextSections;
  });

  const columns = $derived(splitSections(sections));
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
  {#each columns as column, columnIndex (`column-${columnIndex}`)}
    <div class="flex flex-col gap-4">
      {#each column as section, index (`${section.group?.id ?? "virtual"}-${columnIndex}-${index}`)}
        <QuickTextGroupCard
          group={section.group}
          texts={section.texts}
          virtual={section.virtual}
          {oncopy}
          {onedit}
          {ondelete}
          {oneditgroup}
          {ondeletegroup}
          {onmovegroup}
          canMoveUp={section.canMoveUp}
          canMoveDown={section.canMoveDown}
        />
      {/each}
    </div>
  {/each}
</div>
