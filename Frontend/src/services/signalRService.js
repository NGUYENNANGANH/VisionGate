import * as signalR from "@microsoft/signalr";
import { SIGNALR_HUB_URL } from "../config/constants";

class SignalRService {
  constructor() {
    this.connection = null;
    this.handlers = new Map();
    this.retryCount = 0;
    this.maxRetries = 5;
    this.isManuallyDisconnected = false;
  }

  async start() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log("SignalR already connected");
      return true;
    }

    if (this.retryCount >= this.maxRetries) {
      console.warn(
        `SignalR: Max retries (${this.maxRetries}) reached. Stopping connection attempts.`,
      );
      return false;
    }

    this.isManuallyDisconnected = false;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 2s, 5s, 10s, 20s, 30s
          const delays = [2000, 5000, 10000, 20000, 30000];
          return delays[Math.min(retryContext.previousRetryCount, delays.length - 1)];
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register all handlers
    this.handlers.forEach((handler, event) => {
      this.connection.on(event, handler);
    });

    // Connection lifecycle events
    this.connection.onreconnecting((error) => {
      console.warn("SignalR reconnecting...", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("SignalR reconnected:", connectionId);
      this.retryCount = 0;
    });

    this.connection.onclose((error) => {
      if (!this.isManuallyDisconnected) {
        console.error("SignalR connection closed:", error);
        this.scheduleReconnect();
      }
    });

    try {
      await this.connection.start();
      console.log("✅ SignalR Connected successfully");
      this.retryCount = 0;
      return true;
    } catch (err) {
      console.error(
        `❌ SignalR Connection Error (attempt ${this.retryCount + 1}/${this.maxRetries}):`,
        err.message,
      );
      this.retryCount++;
      this.scheduleReconnect();
      return false;
    }
  }

  scheduleReconnect() {
    if (this.retryCount >= this.maxRetries || this.isManuallyDisconnected) {
      return;
    }

    // Exponential backoff
    const delays = [2000, 5000, 10000, 20000, 30000];
    const delay = delays[Math.min(this.retryCount, delays.length - 1)];

    console.log(`SignalR will retry in ${delay / 1000}s...`);
    setTimeout(() => this.start(), delay);
  }

  async stop() {
    this.isManuallyDisconnected = true;
    this.retryCount = 0;
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log("SignalR disconnected");
      } catch (err) {
        console.error("Error stopping SignalR:", err);
      }
    }
  }

  on(event, handler) {
    this.handlers.set(event, handler);
    if (this.connection) {
      this.connection.on(event, handler);
    }
  }

  off(event) {
    this.handlers.delete(event);
    if (this.connection) {
      this.connection.off(event);
    }
  }

  getConnectionState() {
    return this.connection?.state || "Disconnected";
  }

  isConnected() {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  resetRetryCount() {
    this.retryCount = 0;
  }
}

export default new SignalRService();
