import {
  ModuleCategory,
  ModuleConfig,
  ModuleInstance,
  ModuleStatus,
  PageType,
} from "@/types/module-types";
import { createMaterialIcon } from "@/common/material-icons";
import { CommentManager } from "@/mlink-video-controller/managers/comment";
import {
  HeatmapColorScheme,
  HeatmapDisplayMode,
  HeatmapManager,
} from "@/mlink-video-controller/managers/heatmap";
import { NicoVideoPlayer } from "@/mlink-video-controller/services/nico-video-player";

export const heatmapModuleConfig: ModuleConfig = {
  id: "heatmap",
  name: "コメントヒートマップ",
  description: "コメント密度をタイムラインや動画上に表示します",
  version: "1.0.0",
  enabled: true,
  targetPages: [PageType.WATCH],
  dependencies: [],
  category: ModuleCategory.FUNCTIONALITY,
  icon: createMaterialIcon("analytics", { style: "outlined", color: "white" }),
};

interface HeatmapPanelContext {
  shadowRoot: ShadowRoot;
  player: NicoVideoPlayer;
  commentManager: CommentManager;
}

export class HeatmapModule implements ModuleInstance {
  public readonly config: ModuleConfig;

  private readonly manager: HeatmapManager;
  private panelContext: HeatmapPanelContext | null = null;
  private active: boolean = false;

  constructor(config: ModuleConfig = heatmapModuleConfig) {
    this.config = config;
    this.manager = HeatmapManager.getInstance();
  }

  async initialize(): Promise<void> {
    await Promise.resolve();
    this.active = true;
  }

  destroy(): void {
    this.detachFromPanel();
    this.manager.destroy();
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): ModuleStatus {
    return this.active ? ModuleStatus.ACTIVE : ModuleStatus.INACTIVE;
  }

  attachToPanel(context: HeatmapPanelContext): void {
    this.panelContext = context;
    this.active = true;

    const heatmapCanvas =
      context.shadowRoot.querySelector<HTMLCanvasElement>(".heatmap-canvas");
    const heatmapTooltip =
      context.shadowRoot.querySelector<HTMLElement>(".heatmap-tooltip");

    if (!heatmapCanvas || !heatmapTooltip) {
      window.logger.warn("[HeatmapModule] ヒートマップ要素が見つかりません");
      return;
    }

    this.manager.initialize(heatmapCanvas, heatmapTooltip);
    this.setupModeButtons();
    this.setupDetailSettings();
    this.setupCanvasSeeking(heatmapCanvas, heatmapTooltip);
    this.applySavedSettings();
    this.refreshComments();
  }

  detachFromPanel(): void {
    this.panelContext = null;
  }

  render(): void {
    this.manager.render();
  }

  updateComments(): void {
    this.manager.updateComments();
  }

  startPeriodicUpdate(): void {
    this.manager.startPeriodicUpdate();
  }

  stopPeriodicUpdate(): void {
    this.manager.stopPeriodicUpdate();
  }

  getDisplayMode(): HeatmapDisplayMode {
    return this.manager.getDisplayMode();
  }

  setDisplayMode(mode: HeatmapDisplayMode): void {
    this.manager.setDisplayMode(mode);
  }

  getColorScheme(): HeatmapColorScheme {
    return this.manager.getColorScheme();
  }

  setColorScheme(scheme: HeatmapColorScheme): void {
    this.manager.setColorScheme(scheme);
  }

  getSmoothing(): boolean {
    return this.manager.getSmoothing();
  }

  setSmoothing(enabled: boolean): void {
    this.manager.setSmoothing(enabled);
  }

  private setupModeButtons(): void {
    const context = this.panelContext;
    if (!context) return;

    const heatmapModeButtons =
      context.shadowRoot.querySelectorAll(".heatmap-mode-btn");
    heatmapModeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const mode = target.dataset.mode as HeatmapDisplayMode | undefined;

        if (!mode) return;

        heatmapModeButtons.forEach((btn) => btn.removeAttribute("data-active"));
        target.setAttribute("data-active", "");
        this.manager.setDisplayMode(mode);
      });
    });
  }

  private setupDetailSettings(): void {
    const context = this.panelContext;
    if (!context) return;

    const colorSchemeSelect =
      context.shadowRoot.querySelector<HTMLSelectElement>(
        ".heatmap-color-scheme",
      );
    if (colorSchemeSelect) {
      colorSchemeSelect.value = this.manager.getColorScheme();

      const preventPanelClose = (e: Event) => {
        e.stopPropagation();
      };

      colorSchemeSelect.addEventListener("click", preventPanelClose);
      colorSchemeSelect.addEventListener("mousedown", preventPanelClose);
      colorSchemeSelect.addEventListener("mouseup", preventPanelClose);
      colorSchemeSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        this.manager.setColorScheme(
          colorSchemeSelect.value as HeatmapColorScheme,
        );
      });
    }

    const smoothToggle = context.shadowRoot.querySelector<HTMLInputElement>(
      ".heatmap-smooth-toggle",
    );
    if (smoothToggle) {
      smoothToggle.checked = this.manager.getSmoothing();
      smoothToggle.addEventListener("change", (e) => {
        e.stopPropagation();
        this.manager.setSmoothing(smoothToggle.checked);
      });
    }
  }

  private setupCanvasSeeking(
    heatmapCanvas: HTMLCanvasElement,
    heatmapTooltip: HTMLElement,
  ): void {
    const context = this.panelContext;
    if (!context) return;

    heatmapCanvas.addEventListener("mousemove", (e) => {
      const rect = heatmapCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;

      this.manager.showTooltip(position, heatmapTooltip);
    });

    heatmapCanvas.addEventListener("mouseleave", () => {
      this.manager.hideTooltip(heatmapTooltip);
    });

    heatmapCanvas.addEventListener("click", (e) => {
      const rect = heatmapCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / rect.width;
      const duration = context.player.getDuration();

      if (duration) {
        context.player.seek(position * duration);
      }
    });
  }

  private applySavedSettings(): void {
    const context = this.panelContext;
    if (!context) return;

    const currentMode = this.manager.getDisplayMode();
    const heatmapModeButtons =
      context.shadowRoot.querySelectorAll(".heatmap-mode-btn");

    heatmapModeButtons.forEach((button) => {
      const buttonMode = (button as HTMLElement).dataset.mode;
      if (buttonMode === currentMode) {
        button.setAttribute("data-active", "");
      } else {
        button.removeAttribute("data-active");
      }
    });

    this.manager.setDisplayMode(currentMode);
  }

  private refreshComments(): void {
    const context = this.panelContext;
    if (!context) return;

    context.commentManager
      .fetchComments()
      .then((success) => {
        if (!success) {
          window.logger.warn(
            "[HeatmapModule] コメントデータの取得に失敗しました",
          );
          return;
        }

        this.manager.updateComments();
      })
      .catch((error) => {
        window.logger.error(
          "[HeatmapModule] コメント取得処理で予期しないエラーが発生しました:",
          error,
        );
      });
  }
}
