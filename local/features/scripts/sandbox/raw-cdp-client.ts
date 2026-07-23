type CdpParameters = Record<string, unknown>;

interface CdpSuccessMessage {
  id: number;
  result?: unknown;
}

interface CdpErrorMessage {
  id: number;
  error: {
    code: number;
    message: string;
  };
}

export interface CdpEvent {
  method: string;
  params?: Record<string, unknown>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

type EventListener = (event: CdpEvent) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isErrorMessage = (value: unknown): value is CdpErrorMessage =>
  isRecord(value) &&
  typeof value.id === "number" &&
  isRecord(value.error) &&
  typeof value.error.code === "number" &&
  typeof value.error.message === "string";

const isSuccessMessage = (value: unknown): value is CdpSuccessMessage =>
  isRecord(value) && typeof value.id === "number" && !("error" in value);

const isEvent = (value: unknown): value is CdpEvent =>
  isRecord(value) && typeof value.method === "string";

const messageDataToText = (data: unknown): string | null => {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  return null;
};

export class RawCdpClient {
  private nextId = 0;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<EventListener>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
    socket.addEventListener("close", () => {
      const error = new Error("CDP WebSocketが閉じられました。");
      for (const request of this.pending.values()) {
        request.reject(error);
      }
      this.pending.clear();
    });
  }

  static async connect(webSocketDebuggerUrl: string): Promise<RawCdpClient> {
    const socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener(
        "error",
        () =>
          reject(
            new Error(`CDPへ接続できませんでした: ${webSocketDebuggerUrl}`),
          ),
        { once: true },
      );
    });
    return new RawCdpClient(socket);
  }

  send<TResult>(method: string, params: CdpParameters = {}): Promise<TResult> {
    const id = ++this.nextId;
    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  close(): void {
    this.socket.close();
  }

  private handleMessage(data: unknown): void {
    const text = messageDataToText(data);
    if (text === null) {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }

    if (isErrorMessage(message)) {
      const request = this.pending.get(message.id);
      if (request) {
        this.pending.delete(message.id);
        request.reject(
          new Error(`CDP ${message.error.code}: ${message.error.message}`),
        );
      }
      return;
    }

    if (isSuccessMessage(message)) {
      const request = this.pending.get(message.id);
      if (request) {
        this.pending.delete(message.id);
        request.resolve(message.result);
      }
      return;
    }

    if (isEvent(message)) {
      for (const listener of this.listeners) {
        listener(message);
      }
    }
  }
}

interface BrowserVersionEndpoint {
  Browser: string;
  "Protocol-Version": string;
  webSocketDebuggerUrl: string;
}

interface DebugTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

const isBrowserVersionEndpoint = (
  value: unknown,
): value is BrowserVersionEndpoint =>
  isRecord(value) &&
  typeof value.Browser === "string" &&
  typeof value["Protocol-Version"] === "string" &&
  typeof value.webSocketDebuggerUrl === "string";

const isDebugTarget = (value: unknown): value is DebugTarget =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.url === "string" &&
  (value.webSocketDebuggerUrl === undefined ||
    typeof value.webSocketDebuggerUrl === "string");

export const getBrowserVersionEndpoint = async (
  cdpHttpEndpoint: string,
): Promise<BrowserVersionEndpoint> => {
  const response = await fetch(`${cdpHttpEndpoint}/json/version`);
  if (!response.ok) {
    throw new Error(`CDP version endpointが${response.status}を返しました。`);
  }
  const value: unknown = await response.json();
  if (!isBrowserVersionEndpoint(value)) {
    throw new Error("CDP version endpointの応答形式が不正です。");
  }
  return value;
};

export const waitForTargetWebSocket = async (
  cdpHttpEndpoint: string,
  targetId: string,
  timeoutMs = 10_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${cdpHttpEndpoint}/json/list`);
    const value: unknown = await response.json();
    if (Array.isArray(value)) {
      const target = value.find(
        (candidate): candidate is DebugTarget =>
          isDebugTarget(candidate) && candidate.id === targetId,
      );
      if (target?.webSocketDebuggerUrl) {
        return target.webSocketDebuggerUrl;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`CDP target ${targetId} のWebSocketを特定できませんでした。`);
};
