import type { ContextMenuRuleAddStatus } from "./context-menu-rules";

export const OFFICIAL_COMMENT_MENU_API_VERSION = 1;

export type OfficialCommentMenuAction =
  | "copy-comment"
  | "google-search"
  | "open-comment-url"
  | "add-ng-word"
  | "add-ng-user";

export interface OfficialCommentMenuItem {
  id: OfficialCommentMenuAction;
  label: string;
}

export interface ContextMenuNgApplyResult {
  status: ContextMenuRuleAddStatus;
  reapplied: boolean;
}

export interface OfficialCommentMenuApi {
  version: typeof OFFICIAL_COMMENT_MENU_API_VERSION;
  getItems: (comment: unknown) => OfficialCommentMenuItem[];
  execute: (action: unknown, comment: unknown) => Promise<boolean>;
}

type NotificationLevel = "success" | "info" | "warning" | "error";

export interface OfficialCommentMenuDependencies {
  writeClipboard: (text: string) => Promise<void>;
  openWindow: (url: string) => void;
  addNgWord: (word: string) => Promise<ContextMenuNgApplyResult>;
  addNgUser: (userId: string) => Promise<ContextMenuNgApplyResult>;
  notify: (level: NotificationLevel, message: string) => void;
}

interface OfficialCommentValue {
  body: string;
  userId: string | null;
}

const BASE_ITEMS: readonly OfficialCommentMenuItem[] = [
  { id: "copy-comment", label: "コメントをコピー" },
  { id: "google-search", label: "Googleで検索" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseComment(value: unknown): OfficialCommentValue | null {
  if (!isRecord(value) || typeof value["body"] !== "string") {
    return null;
  }
  const body = value["body"];
  if (body.trim().length === 0) {
    return null;
  }
  const rawUserId = value["userId"];
  const userId =
    typeof rawUserId === "string" && rawUserId.trim().length > 0
      ? rawUserId.trim()
      : null;
  return { body, userId };
}

export function resolveDirectCommentUrl(commentBody: string): string | null {
  const candidate = commentBody.trim();
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function buildGoogleSearchUrl(query: string): string {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return url.href;
}

function isAction(value: unknown): value is OfficialCommentMenuAction {
  return (
    value === "copy-comment" ||
    value === "google-search" ||
    value === "open-comment-url" ||
    value === "add-ng-word" ||
    value === "add-ng-user"
  );
}

export class OfficialCommentMenu implements OfficialCommentMenuApi {
  public readonly version = OFFICIAL_COMMENT_MENU_API_VERSION;

  constructor(private readonly dependencies: OfficialCommentMenuDependencies) {}

  public getItems(comment: unknown): OfficialCommentMenuItem[] {
    const value = parseComment(comment);
    if (!value) {
      return [];
    }
    return [
      ...BASE_ITEMS,
      ...(resolveDirectCommentUrl(value.body)
        ? ([
            {
              id: "open-comment-url",
              label: "URLを新しいタブで開く",
            },
          ] satisfies OfficialCommentMenuItem[])
        : []),
      { id: "add-ng-word", label: "comment-filter2にNGワード追加" },
      ...(value.userId
        ? ([
            {
              id: "add-ng-user",
              label: "comment-filter2にNGユーザーID追加",
            },
          ] satisfies OfficialCommentMenuItem[])
        : []),
    ];
  }

  public async execute(action: unknown, comment: unknown): Promise<boolean> {
    const value = parseComment(comment);
    if (!value || !isAction(action)) {
      return false;
    }
    try {
      switch (action) {
        case "copy-comment":
          await this.dependencies.writeClipboard(value.body);
          this.dependencies.notify("success", "コメントをコピーしました");
          return true;
        case "google-search":
          this.dependencies.openWindow(buildGoogleSearchUrl(value.body));
          return true;
        case "open-comment-url": {
          const url = resolveDirectCommentUrl(value.body);
          if (!url) {
            return false;
          }
          this.dependencies.openWindow(url);
          return true;
        }
        case "add-ng-word":
          return await this.addNgRule(
            "NGワード",
            this.dependencies.addNgWord(value.body),
          );
        case "add-ng-user":
          if (!value.userId) {
            return false;
          }
          return await this.addNgRule(
            "NGユーザーID",
            this.dependencies.addNgUser(value.userId),
          );
      }
    } catch (error) {
      this.dependencies.notify(
        "error",
        `コメントメニューの操作に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async addNgRule(
    label: string,
    operation: Promise<ContextMenuNgApplyResult>,
  ): Promise<boolean> {
    const result = await operation;
    if (result.status === "already-exists") {
      this.dependencies.notify(
        "info",
        `${label}はcomment-filter2に登録済みです`,
      );
      return true;
    }
    if (result.reapplied) {
      this.dependencies.notify(
        "success",
        `${label}をcomment-filter2に追加して反映しました`,
      );
    } else {
      this.dependencies.notify(
        "warning",
        `${label}をcomment-filter2に追加しました。現在のコメントへ反映するには「今すぐ適用」を実行してください`,
      );
    }
    return true;
  }
}
