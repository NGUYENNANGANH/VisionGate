// Cloudinary config - Thay YOUR_CLOUD_NAME bằng cloud name của bạn
const CLOUDINARY_CLOUD_NAME = "dmh02ga34";
const CLOUDINARY_UPLOAD_PRESET = "visiongate"; // Tạo preset này trên Cloudinary dashboard

export const uploadService = {
  /**
   * Upload ảnh lên Cloudinary
   * @param {File} file - File ảnh cần upload
   * @param {string} folder - Thư mục lưu trữ (vd: 'employees')
   * @returns {Promise<string>} - URL của ảnh đã upload
   */
  async uploadImage(file, folder = "employees") {
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Kích thước ảnh không được vượt quá 5MB");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.secure_url; // Trả về HTTPS URL
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Không thể upload ảnh. Vui lòng thử lại.");
    }
  },

  /**
   * Delete ảnh từ Cloudinary (cần backend hỗ trợ vì cần API secret)
   */
  async deleteImage(publicId) {
    // Cần implement ở backend vì delete cần API secret
    console.log("Delete image:", publicId);
  },
};
