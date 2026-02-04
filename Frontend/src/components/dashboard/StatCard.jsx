import "./StatCard.css";

function StatCard({ icon, label, value, trend, highlight }) {
  const Icon = icon;

  return (
    <div className={`stat-card ${highlight ? "highlight" : ""}`}>
      <div className={`stat-icon ${label.toLowerCase().replace(/\s/g, "-")}`}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && (
          <div className={`stat-change ${trend.type}`}>
            {trend.icon && <trend.icon size={14} />}
            <span>{trend.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
