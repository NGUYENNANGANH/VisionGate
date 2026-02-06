import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, User, Shield } from "lucide-react";
import { authService } from "../services/authService";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="login-container">
      <div className="login-left">
        <div className="ai-badge">
          <Shield size={16} />
          <span>Bảo Mật Bằng AI</span>
        </div>

        <div className="login-content">
          <h1 className="login-title">Truy cập doanh nghiệp</h1>
          <h2 className="login-subtitle">Kiểm soát bởi AI.</h2>
          <p className="login-description">
            VisionGate sử dụng công nghệ nhận dạng sinh trắc học tiên tiến để
            đảm bảo chỉ những người được ủy quyền mới có thể truy cập vào các
            khu vực nhạy cảm.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="login-header">
            <div className="logo">
              <Shield className="logo-icon" size={32} />
              <span className="logo-text">VisionGate</span>
            </div>
          </div>

          <div className="form-wrapper">
            <h2 className="form-title">Đăng nhập</h2>
            <p className="form-subtitle">
              Nhập thông tin đăng nhập để truy cập bảng điều khiển bảo mật
            </p>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Tên đăng nhập</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={12} />
                  <input
                    id="username"
                    type="text"
                    placeholder="Nhập tên đăng nhập của bạn"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="password">Mật khẩu</label>
                  <Link to="/forgot-password" className="forgot-link">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={12} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Duy trì đăng nhập trong 30 ngày</span>
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
              </button>
            </form>

            <p className="powered-by">Powered by HINET</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
