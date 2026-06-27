import { APIClient } from "@/cache-data-manager/clients/api-client.js";
import type { APIResponse } from "@/types";

// APIClientを必要時のみ読み込む
export class LazyAPIClient {
  private client: APIClient | null = null;

  public async fetchVideoInfo(
    id: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<APIResponse> {
    if (!this.client) {
      this.client = new APIClient();
    }
    return this.client.fetchVideoInfo(id, options);
  }
}
