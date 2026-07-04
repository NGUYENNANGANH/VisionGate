import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import { Icon, ShieldLogo } from "../components/ui/Icon";
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
        <div className="login-hero-grid" />

        <div className="login-brand">
          <div className="brand-mark"><ShieldLogo size={22} /></div>
          <div className="login-brand-name">VisionGate</div>
        </div>

        <div className="login-hero-content">
          <div className="login-ai-badge">
            <Icon name="fingerprint" size={15} />
            Bảo mật bằng AI
          </div>
          <h1 className="login-h1">
            Quản lý điểm danh và{" "}
            <span className="login-h1-accent">giám sát an ninh AI.</span>
          </h1>
          <p className="login-desc">
            Hệ thống nhận diện khuôn mặt tự động chấm công, theo dõi thời gian
            thực và phát hiện vi phạm an toàn lao động, giúp tối ưu hóa quản lý
            nhân sự.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="login-form-side">
        <div className="login-card fade-in">
          <div className="login-card-head">
            <div className="login-card-icon">
              <ShieldLogo size={28} />
            </div>
            <h2 className="login-card-title">Đăng nhập</h2>
            <p className="page-sub login-card-sub">Truy cập bảng điều khiển bảo mật</p>
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
              <div className="login-label-row">
                <label>Mật khẩu</label>
              </div>
              <div className="input-icon">
                <Icon name="lock" size={17} />
                <input
                  className="input login-pass-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-pass-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <Icon name={showPassword ? "eye_off" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading}
            >
              <Icon name="fingerprint" size={18} />
              {loading ? "Đang xác thực…" : "Đăng nhập an toàn"}
            </button>
          </form>

          <p className="login-foot-note">
            <Icon name="lock" size={13} />
            Kết nối được mã hóa &amp; bảo mật
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
