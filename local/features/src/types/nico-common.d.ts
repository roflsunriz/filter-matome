/**
 * NicoCommon グローバル型宣言
 */

import type { HeaderConfig, CommonHeaderInstance } from "@/types/common-types";

declare global {
  interface Window {
    NicoCommon: {
      createHeader(containerId: string, config?: HeaderConfig): CommonHeaderInstance;
      CommonHeader: new (container: HTMLElement | string, config?: HeaderConfig) => CommonHeaderInstance;
    };
  }
}

// TypeScript の module augmentation のために必要
export {}; 