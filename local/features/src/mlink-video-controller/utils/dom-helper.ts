export class DOMHelper {
  public static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    attributes?: Record<string, string>,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    return element;
  }

  public static setStyles(
    element: HTMLElement,
    styles: Partial<CSSStyleDeclaration>,
  ): void {
    Object.assign(element.style, styles);
  }

  public static addEventListeners<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    events: { [P in K]?: (event: HTMLElementEventMap[P]) => void },
  ): void {
    Object.entries(events).forEach(([eventName, handler]) => {
      element.addEventListener(eventName as K, handler as EventListener);
    });
  }

  public static removeEventListeners<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    events: { [P in K]?: (event: HTMLElementEventMap[P]) => void },
  ): void {
    Object.entries(events).forEach(([eventName, handler]) => {
      element.removeEventListener(eventName as K, handler as EventListener);
    });
  }
}
