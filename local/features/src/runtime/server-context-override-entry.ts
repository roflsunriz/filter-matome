import {
  applyServerContextOverrides,
  installCommentPostMembershipGuard,
  parseServerContextOverrideConfig,
  readSessionUserType,
} from "@/runtime/server-context-override";

const CONFIG_ELEMENT_ID = "filter-matome-server-context-overrides";
const SERVER_CONTEXT_META_NAME = "server-context";
const SESSION_USER_TYPE_PATH = "sessionUser.type";

function startServerContextOverride(): void {
  const script = document.currentScript;
  const configElement = script?.previousElementSibling;
  const meta = configElement?.previousElementSibling;

  try {
    if (
      !(configElement instanceof HTMLScriptElement) ||
      configElement.id !== CONFIG_ELEMENT_ID ||
      configElement.type !== "application/json"
    ) {
      throw new Error("serverContext設定要素を取得できませんでした");
    }
    if (
      !(meta instanceof HTMLMetaElement) ||
      meta.name !== SERVER_CONTEXT_META_NAME
    ) {
      throw new Error("server-contextメタタグを取得できませんでした");
    }

    const config = parseServerContextOverrideConfig(
      configElement.textContent ?? "",
    );
    const serverContext: unknown = JSON.parse(meta.content);
    const originalSessionUserType = readSessionUserType(serverContext);
    const appliedPaths = applyServerContextOverrides(serverContext, config);

    meta.content = JSON.stringify(serverContext);

    if (appliedPaths.includes(SESSION_USER_TYPE_PATH)) {
      try {
        installCommentPostMembershipGuard(originalSessionUserType);
      } catch (error: unknown) {
        console.warn(
          "[filter-matome] コメント投稿の会員種別保護に失敗しました",
          error,
        );
      }
    }
  } catch (error: unknown) {
    console.warn(
      "[filter-matome] serverContextの書き換えに失敗しました",
      error,
    );
  } finally {
    configElement?.remove();
    script?.remove();
  }
}

startServerContextOverride();
