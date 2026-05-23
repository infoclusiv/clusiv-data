<script lang="ts">
  import QuickTextGroupCard from "$lib/components/quick-texts/QuickTextGroupCard.svelte";
  import type { QuickText, QuickTextGroup } from "$lib/store/types";
  import {
    getEffectiveQuickTextGroupIds,
    getQuickTextGroupSortOrder,
  } from "$lib/utils/categoryUtils";

  interface Props {
    groups: QuickTextGroup[];
    quickTexts: QuickText[];
    oncopy: (quickText: QuickText) => void;
    onedit: (quickText: QuickText) => void;
    ondelete: (quickText: QuickText) => void;
    onremovefromgroup?: (quickText: QuickText, group: QuickTextGroup) => void;
    onmovequicktextingroup?: (
      quickText: QuickText,
      group: QuickTextGroup,
      direction: "up" | "down",
    ) => void;
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

  let {
    groups,
    quickTexts,
    oncopy,
    onedit,
    ondelete,
    onremovefromgroup,
    onmovequicktextingroup,
    oneditgroup,
    ondeletegroup,
    onmovegroup,
  }: Props = $props();

  function sortGroups(items: QuickTextGroup[]): QuickTextGroup[] {
    return items
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  }

  function sortTexts(items: QuickText[], groupId: string | null): QuickText[] {
    return items
      .slice()
      .sort((left, right) =>
        getQuickTextGroupSortOrder(left, groupId) - getQuickTextGroupSortOrder(right, groupId)
        || left.title.localeCompare(right.title)
      );
  }

  const sections = $derived.by<GroupSection[]>(() => {
    const sortedGroups = sortGroups(groups);
    const validGroupIds = new Set(sortedGroups.map((group) => group.id));

    const byGroupId = new Map<string, QuickText[]>();
    const ungroupedTexts: QuickText[] = [];

    for (const quickText of quickTexts) {
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
      texts: sortTexts(byGroupId.get(group.id) ?? [], group.id),
      virtual: false,
      canMoveUp: index > 0,
      canMoveDown: index < sortedGroups.length - 1,
    }));

    if (ungroupedTexts.length > 0) {
      nextSections.push({
        group: null,
        texts: sortTexts(ungroupedTexts, null),
        virtual: true,
        canMoveUp: false,
        canMoveDown: false,
      });
    }

    return nextSections;
  });
</script>

<div class="flex flex-col gap-4">
  {#each sections as section (`${section.group?.id ?? "virtual"}`)}
    <QuickTextGroupCard
      group={section.group}
      texts={section.texts}
      virtual={section.virtual}
      {oncopy}
      {onedit}
      {ondelete}
      {onremovefromgroup}
      {onmovequicktextingroup}
      {oneditgroup}
      {ondeletegroup}
      {onmovegroup}
      canMoveUp={section.canMoveUp}
      canMoveDown={section.canMoveDown}
    />
  {/each}
</div>
