import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

      // Save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
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
          <span>AI Powered Security</span>
        </div>

        <div className="login-content">
          <h1 className="login-title">Enterprise Access</h1>
          <h2 className="login-subtitle">Controlled by AI.</h2>

          <p className="login-description">
            VisionGate uses advanced biometric recognition to ensure that only
            authorized personnel can access sensitive environments.
          </p>
        </div>

        {/* <div className="face-recognition-visual">
          <div className="face-outline">
            <div className="scan-line"></div>
          </div>
        </div> */}
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="login-header">
            <div className="logo">
              <Shield className="logo-icon" size={32} />
              <span className="logo-text">VisionGate</span>
            </div>
            {/* Đã xóa nút ngôn ngữ tại đây */}
          </div>

          <div className="form-wrapper">
            <h2 className="form-title">Secure Login</h2>
            <p className="form-subtitle">
              Enter your credentials to access the security dashboard
            </p>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username or Email</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={20} />
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="password">Password</label>
                  <a href="#" className="forgot-link">
                    Forgot password?
                  </a>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                  <span>Stay signed in for 30 days</span>
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="footer-links">
              <a href="#">Help Center</a>
              <span>•</span>
              <a href="#">Privacy Policy</a>
              <span>•</span>
              <a href="#">Terms of Service</a>
            </div>

            <p className="powered-by">Powered by HINET</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
