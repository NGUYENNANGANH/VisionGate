import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import { Icon, ShieldLogo } from "../components/ui/Icon";
import { AICameraFeed } from "../components/ui/AICameraFeed";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Left hero */}
      <div className="login-hero">
        <div className="login-hero-glow" />

        <div className="login-brand">
          <div className="brand-mark"><ShieldLogo size={22} /></div>
          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: "-.02em" }}>VisionGate</div>
        </div>

        <div className="login-hero-content">
          <div className="login-headline">
            <div className="login-ai-badge">
              <Icon name="fingerprint" size={15} />
              Bảo mật bằng AI
            </div>
            <h1 className="login-h1">
              Quản lý điểm danh và{" "}
              <span className="login-h1-accent">giám sát an ninh AI.</span>
            </h1>
            <p className="login-desc">
              Hệ thống nhận diện khuôn mặt tự động chấm công, theo dõi thời gian thực và phát hiện vi phạm an toàn lao động, giúp tối ưu hóa quản lý nhân sự.
            </p>
          </div>

          <AICameraFeed height={200} label="Cổng chính — CAM-01" />
        </div>
      </div>

      {/* Right form */}
      <div className="login-form-side">
        <div className="login-card fade-in">
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div className="login-card-icon">
              <ShieldLogo size={28} />
            </div>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>Đăng nhập</h2>
            <p className="page-sub" style={{ marginTop: 7 }}>Truy cập bảng điều khiển bảo mật</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Tên đăng nhập</label>
              <div className="input-icon">
                <Icon name="user" size={17} />
                <input
                  className="input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ marginBottom: 0 }}>Mật khẩu</label>
                <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-700)" }}>Quên mật khẩu?</Link>
              </div>
              <div style={{ position: "relative", marginTop: 7 }}>
                <Icon name="lock" size={17} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 40, paddingRight: 42 }}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", padding: 4, background: "none", border: "none", cursor: "pointer" }}
                >
                  <Icon name={showPassword ? "eye_off" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 20 }}
              disabled={loading}
            >
              <Icon name="fingerprint" size={18} />
              {loading ? "Đang xác thực…" : "Đăng nhập an toàn"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
