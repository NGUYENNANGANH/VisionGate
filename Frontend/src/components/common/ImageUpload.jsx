import { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { uploadService } from "../../services/uploadService";
import "./ImageUpload.css";

function ImageUpload({
  value,
  onChange,
  onUploadComplete,
  label = "Upload anh",
  folder = "employees",
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      const uploaded = await uploadService.uploadImageWithMetadata(file, folder);
      onChange(uploaded.url);
      onUploadComplete?.(uploaded);
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
    onUploadComplete?.(null);
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
              <p>Dang upload...</p>
            </div>
          ) : (
            <>
              <ImageIcon size={32} />
              <p>Click de chon anh</p>
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
