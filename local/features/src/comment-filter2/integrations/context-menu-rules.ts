import type { NgRuleJson } from "@/types/filter-types";

export type ContextMenuRuleAddStatus =
  "added" | "already-exists" | "reactivated";

export interface ContextMenuRuleUpsertResult {
  rules: NgRuleJson[];
  status: ContextMenuRuleAddStatus;
}

const CONTEXT_MENU_RULE_DESCRIPTION =
  "公式プレイヤーのコメントメニューから追加";

export function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createContextMenuNgWordRule(
  commentBody: string,
): NgRuleJson | null {
  const word = commentBody.trim();
  if (word.length === 0) {
    return null;
  }
  return {
    pattern: escapeRegExpLiteral(word),
    flags: "gi",
    action: { type: "hide" },
    smid: ["ALL"],
    description: CONTEXT_MENU_RULE_DESCRIPTION,
    enabled: true,
  };
}

export function createContextMenuNgUserRule(
  commentUserId: string,
): NgRuleJson | null {
  const userId = commentUserId.trim();
  if (userId.length === 0) {
    return null;
  }
  return {
    userId,
    action: { type: "hide" },
    smid: ["ALL"],
    description: CONTEXT_MENU_RULE_DESCRIPTION,
    enabled: true,
  };
}

function normalizeFlags(flags: string | undefined): string {
  return Array.from(new Set(flags ?? ""))
    .sort()
    .join("");
}

function isEquivalentContextMenuRule(
  candidate: NgRuleJson,
  expected: NgRuleJson,
): boolean {
  if (candidate.action.type !== "hide" || !candidate.smid.includes("ALL")) {
    return false;
  }
  if (expected.pattern !== undefined) {
    return (
      candidate.pattern === expected.pattern &&
      normalizeFlags(candidate.flags) === normalizeFlags(expected.flags)
    );
  }
  return candidate.userId === expected.userId;
}

export function upsertContextMenuRule(
  currentRules: readonly NgRuleJson[],
  rule: NgRuleJson,
): ContextMenuRuleUpsertResult {
  const index = currentRules.findIndex((candidate) =>
    isEquivalentContextMenuRule(candidate, rule),
  );
  if (index < 0) {
    return { rules: [...currentRules, rule], status: "added" };
  }
  if (currentRules[index]?.enabled !== false) {
    return { rules: [...currentRules], status: "already-exists" };
  }
  return {
    rules: currentRules.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, enabled: true } : candidate,
    ),
    status: "reactivated",
  };
}
