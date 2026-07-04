export class PanelNavigationController {
  constructor(private readonly root: ShadowRoot) {}

  bind(): void {
    this.root.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        if (!(e.target instanceof Element)) return;

        const target = e.target.closest("[data-tab]");
        if (!target || target.hasAttribute("disabled")) return;
        if (!(target instanceof HTMLElement)) return;

        const tabId = target.dataset.tab;
        if (tabId) {
          this.activateTab(tabId);
        }
      });
    });

    this.root.querySelectorAll("[data-subtab]").forEach((subtab) => {
      subtab.addEventListener("click", (e) => {
        if (!(e.target instanceof Element)) return;

        const target = e.target.closest("[data-subtab]");
        if (!(target instanceof HTMLElement)) return;

        const subtabId = target.dataset.subtab;
        if (subtabId) {
          this.activateSubtab(subtabId);
        }
      });
    });
  }

  activateTab(tabId: string): void {
    this.root.querySelectorAll("[data-tab]").forEach((tab) => {
      if ((tab as HTMLElement).dataset.tab === tabId) {
        tab.setAttribute("data-active", "");
      } else {
        tab.removeAttribute("data-active");
      }
    });

    this.root.querySelectorAll(".tab").forEach((content) => {
      content.classList.toggle("active", content.id === tabId);
    });
  }

  activateSubtab(subtabId: string): void {
    this.root.querySelectorAll("[data-subtab]").forEach((tab) => {
      if ((tab as HTMLElement).dataset.subtab === subtabId) {
        tab.setAttribute("data-active", "");
      } else {
        tab.removeAttribute("data-active");
      }
    });

    this.root.querySelectorAll(".subtab").forEach((content) => {
      content.classList.toggle("active", content.id === subtabId);
    });
  }
}
