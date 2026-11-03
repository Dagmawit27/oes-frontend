import { Client, IMessage, StompSubscription } from "@stomp/stompjs";

export type WebSocketConnectionStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "ERROR";

class StompWebSocketManager {
  private client: Client | null = null;
  private statusListeners: ((status: WebSocketConnectionStatus) => void)[] = [];
  private currentStatus: WebSocketConnectionStatus = "DISCONNECTED";

  public getStatus(): WebSocketConnectionStatus {
    return this.currentStatus;
  }

  public onStatusChange(listener: (status: WebSocketConnectionStatus) => void) {
    this.statusListeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(newStatus: WebSocketConnectionStatus) {
    this.currentStatus = newStatus;
    this.statusListeners.forEach((listener) => listener(newStatus));
  }

  public connect(token?: string): Client {
    if (this.client && this.client.active) {
      return this.client;
    }

    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("oes_access_token") ||
          localStorage.getItem("access_token")
        : null);

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

    this.updateStatus("CONNECTING");

    this.client = new Client({
      brokerURL: wsUrl,
      connectHeaders: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[STOMP]", str);
        }
      },
      onConnect: () => {
        this.updateStatus("CONNECTED");
      },
      onDisconnect: () => {
        this.updateStatus("DISCONNECTED");
      },
      onStompError: (frame) => {
        console.error("[STOMP Error]", frame.headers["message"], frame.body);
        this.updateStatus("ERROR");
      },
      onWebSocketError: (event) => {
        console.warn("[WebSocket Error]", event);
        this.updateStatus("ERROR");
      },
      onWebSocketClose: () => {
        this.updateStatus("DISCONNECTED");
      },
    });

    this.client.activate();
    return this.client;
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.updateStatus("DISCONNECTED");
    }
  }

  public subscribe(
    destination: string,
    callback: (message: IMessage) => void
  ): StompSubscription | null {
    if (!this.client || !this.client.connected) {
      return null;
    }
    return this.client.subscribe(destination, callback);
  }

  public getClient(): Client | null {
    return this.client;
  }
}

export const stompManager = new StompWebSocketManager();
