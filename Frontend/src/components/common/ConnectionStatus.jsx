import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import signalRService from "../../services/signalRService";
import "./ConnectionStatus.css";

function ConnectionStatus() {
  const [status, setStatus] = useState("connecting");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkConnection = () => {
      const state = signalRService.getConnectionState();
      const isConnected = signalRService.isConnected();

      if (isConnected) {
        setStatus("connected");
        setRetryCount(0);
      } else if (state === "Reconnecting") {
        setStatus("reconnecting");
      } else {
        setStatus("disconnected");
        setRetryCount(signalRService.retryCount || 0);
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkConnection, 2000);
    checkConnection();

    return () => clearInterval(interval);
  }, []);

  if (status === "connected") {
    return (
      <div className="connection-status connected">
        <Wifi size={16} />
        <span>Real-time connected</span>
      </div>
    );
  }

  if (status === "reconnecting") {
    return (
      <div className="connection-status reconnecting">
        <AlertCircle size={16} />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="connection-status disconnected">
      <WifiOff size={16} />
      <span>
        Offline {retryCount > 0 && `(${retryCount}/5 retries)`}
      </span>
    </div>
  );
}

export default ConnectionStatus;
