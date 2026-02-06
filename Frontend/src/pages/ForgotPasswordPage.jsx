import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Shield } from "lucide-react";
import "./ForgotPasswordPage.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // TODO: Implement password reset API call
      // await authService.forgotPassword(email);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể gửi email. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-left">
          <div className="ai-badge">
            <Shield size={16} />
            <span>Bảo Mật Bằng AI</span>
          </div>

          <div className="forgot-password-content">
            <h1 className="forgot-password-title">Khôi phục tài khoản</h1>
            <h2 className="forgot-password-subtitle">An toàn & Bảo mật.</h2>
            <p className="forgot-password-description">
              VisionGate đảm bảo quy trình khôi phục mật khẩu an toàn và bảo mật
              tuyệt đối cho tài khoản của bạn.
            </p>
          </div>
        </div>

        <div className="forgot-password-right">
          <div className="forgot-password-form-container">
            <div className="forgot-password-header">
              <div className="logo">
                <Shield className="logo-icon" size={32} />
                <span className="logo-text">VisionGate</span>
              </div>
            </div>

            <div className="form-wrapper">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h2 className="success-title">Email đã được gửi!</h2>
                <p className="success-text">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email{" "}
                  <strong>{email}</strong>. Vui lòng kiểm tra hộp thư của bạn.
                </p>
                <p className="success-note">
                  Không nhận được email? Kiểm tra thư mục spam hoặc thử lại sau
                  vài phút.
                </p>
              </div>

              <Link to="/login" className="back-to-login">
                <ArrowLeft size={16} />
                Quay lại đăng nhập
              </Link>

              <p className="powered-by">Powered by HINET</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-left">
        <div className="ai-badge">
          <Shield size={16} />
          <span>Bảo Mật Bằng AI</span>
        </div>

        <div className="forgot-password-content">
          <h1 className="forgot-password-title">Khôi phục tài khoản</h1>
          <h2 className="forgot-password-subtitle">An toàn & Bảo mật.</h2>
          <p className="forgot-password-description">
            VisionGate đảm bảo quy trình khôi phục mật khẩu an toàn và bảo mật
            tuyệt đối cho tài khoản của bạn.
          </p>
        </div>
      </div>

      <div className="forgot-password-right">
        <div className="forgot-password-form-container">
          <div className="forgot-password-header">
            <div className="logo">
              <Shield className="logo-icon" size={32} />
              <span className="logo-text">VisionGate</span>
            </div>
          </div>

          <div className="form-wrapper">
            <h2 className="form-title">Quên mật khẩu?</h2>
            <p className="form-subtitle">
              Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại
              mật khẩu
            </p>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={12} />
                  <input
                    id="email"
                    type="email"
                    placeholder="Nhập địa chỉ email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi hướng dẫn"}
              </button>
            </form>

            <Link to="/login" className="back-to-login">
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>

            <p className="powered-by">Powered by HINET</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
