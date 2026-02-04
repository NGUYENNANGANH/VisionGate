import * as signalR from "@microsoft/signalr";
import { SIGNALR_HUB_URL } from "../config/constants";

class SignalRService {
  constructor() {
    this.connection = null;
    this.handlers = new Map();
  }

  async start() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL)
      .withAutomaticReconnect()
      .build();

    // Register all handlers
    this.handlers.forEach((handler, event) => {
      this.connection.on(event, handler);
    });

    try {
      await this.connection.start();
      console.log("SignalR Connected");
    } catch (err) {
      console.error("SignalR Connection Error:", err);
      setTimeout(() => this.start(), 5000); // Retry after 5s
    }
  }

  async stop() {
    if (this.connection) {
      await this.connection.stop();
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
}

export default new SignalRService();
