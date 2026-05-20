import { useState } from "react";
import "./LiveFeed.css";

const STREAM_URL = "http://localhost:5000/camera/stream";

function LiveFeed({ connected }) {
  const [streamError, setStreamError] = useState(false);

  const isOnline = connected && !streamError;

  return (
    <div className="feed-card">
      <div className="card-header">
        <div className="card-title">
          <span className={`live-badge ${isOnline ? '' : 'offline'}`}>
            {isOnline ? '🔴 LIVE' : '⚫ OFFLINE'}
          </span>
          <span>Real-time AI Feed</span>
        </div>
        <span className="feed-location">Main Entrance - Cam 01</span>
      </div>
      <div className="feed-content">
        <div className="feed-video">
          {isOnline ? (
            <img
              src={STREAM_URL}
              alt="Live Camera Feed"
              className="feed-stream"
              onError={() => setStreamError(true)}
            />
          ) : (
            <div className="video-overlay">
              <div className="offline-message">
                <span className="offline-icon">📷</span>
                <span>{connected ? 'Camera stream không khả dụng' : 'Camera Offline'}</span>
                {streamError && (
                  <button
                    className="retry-btn"
                    onClick={() => setStreamError(false)}
                  >
                    Thử lại
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveFeed;
