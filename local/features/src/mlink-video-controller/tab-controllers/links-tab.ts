import { LinkData, LinkGroup } from "@/types/mlink-video-controller-types";

interface LinkManagerLike {
  getLinks(group: LinkGroup): Promise<LinkData[]>;
  handleAction(action: string): Promise<void>;
}

export class LinksTabController {
  constructor(
    private readonly root: ShadowRoot,
    private readonly linkManager: LinkManagerLike | null,
  ) {}

  async renderLinkGroup(group: LinkGroup): Promise<string> {
    const links = (await this.linkManager?.getLinks(group)) || [];
    return links
      .map((link: LinkData) => {
        const disabledAttributes = link.disabled
          ? ` data-disabled="true" aria-disabled="true" title="${link.disabledReason ?? "現在のページでは利用できません"}"`
          : "";
        return `
      <div class="action-card${link.disabled ? " action-card-disabled" : ""}" data-action="${link.action}"${disabledAttributes}>
        <img src="${link.icon}" alt="${link.title}" />
        <span>${link.title}</span>
      </div>
    `;
      })
      .join("");
  }

  bind(): void {
    this.root.querySelectorAll(".action-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        void (async () => {
          if (!(e.target instanceof Element)) return;

          const actionCard = e.target.closest(".action-card");
          if (
            actionCard instanceof HTMLElement &&
            actionCard.dataset.action &&
            actionCard.dataset.disabled !== "true" &&
            this.linkManager
          ) {
            await this.linkManager.handleAction(actionCard.dataset.action);
          }
        })();
      });
    });
  }
}
