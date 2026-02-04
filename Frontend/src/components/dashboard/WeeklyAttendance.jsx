import "./WeeklyAttendance.css";

function WeeklyAttendance() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="attendance-card">
      <div className="card-header">
        <h3>Weekly Attendance Distribution</h3>
      </div>
      <div className="attendance-chart">
        {days.map((day, i) => (
          <div key={day} className="chart-bar">
            <div className="bar-stack">
              <div
                className="bar-segment expected"
                style={{ height: "60%" }}
              ></div>
              <div
                className="bar-segment actual"
                style={{ height: `${70 - i * 5}%` }}
              ></div>
            </div>
            <div className="bar-label">{day}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot light-blue"></span>
          <span>Expected</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dark-blue"></span>
          <span>Actual</span>
        </div>
      </div>
    </div>
  );
}

export default WeeklyAttendance;
