import "./ComplianceChart.css";

function ComplianceChart() {
  const complianceData = [
    { label: "Mũ bảo hộ", value: 94, color: "blue" },
    { label: "Áo phản quang", value: 88, color: "green" },
    { label: "Giày bảo hộ", value: 91, color: "gray" },
  ];

  return (
    <div className="compliance-card">
      <div className="card-header">
        <h3>Tuân thủ an toàn</h3>
      </div>
      <div className="compliance-chart">
        <div className="donut-chart">
          <div className="chart-value">92%</div>
          <div className="chart-label">TRUNG BÌNH</div>
        </div>
      </div>
      <div className="compliance-legend">
        {complianceData.map((item) => (
          <div key={item.label} className="legend-item">
            <span className={`legend-dot ${item.color}`}></span>
            <span>{item.label}</span>
            <span className="legend-value">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ComplianceChart;
