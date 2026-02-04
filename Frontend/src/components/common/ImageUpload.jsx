import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { uploadService } from "../../services/uploadService";
import "./ImageUpload.css";

function ImageUpload({ value, onChange, label = "Upload ảnh" }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  //   useEffect(() => {
  //     setPreview(value || null);
  //   }, [value]);
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      const url = await uploadService.uploadImage(file, "employees");
      onChange(url);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="image-upload">
      <label className="image-upload-label">{label}</label>

      {preview ? (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button
            type="button"
            className="image-remove"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className="image-upload-box"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="upload-loading">
              <div className="spinner"></div>
              <p>Đang upload...</p>
            </div>
          ) : (
            <>
              <ImageIcon size={32} />
              <p>Click để chọn ảnh</p>
              <span>JPG, PNG, WEBP (Max 5MB)</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}

export default ImageUpload;
