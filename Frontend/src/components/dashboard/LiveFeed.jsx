import "./LiveFeed.css";

function LiveFeed({ connected }) {
  return (
    <div className="feed-card">
      <div className="card-header">
        <div className="card-title">
          <span className="live-badge">🔴 LIVE</span>
          <span>Real-time AI Feed</span>
        </div>
        <span className="feed-location">Main Entrance - Cam 01</span>
      </div>
      <div className="feed-content">
        <div className="feed-video">
          <div className="video-overlay">
            <div className="detection-box authorized">
              <span>ID: 4029 ✓</span>
              <span>AUTHORIZED</span>
            </div>
            <div className="detection-box unauthorized">
              <span>UNRECOGNIZED</span>
            </div>
            <div className="system-status">
              <div className="status-item">
                <span>SYSTEM STATUS:</span>
                <span
                  className={`status-value ${connected ? "optimal" : "warning"}`}
                >
                  {connected ? "Object Detection: Optimal" : "Disconnected"}
                </span>
              </div>
              <div className="status-item">
                <span>Processing Latency: 14ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveFeed;
