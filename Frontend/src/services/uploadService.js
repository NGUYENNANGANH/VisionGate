const CLOUDINARY_CLOUD_NAME = "dmh02ga34";
const CLOUDINARY_UPLOAD_PRESET = "visiongate";

export const uploadService = {
  async uploadImage(file, folder = "employees") {
    const uploaded = await this.uploadImageWithMetadata(file, folder);
    return uploaded.url;
  },

  async uploadImageWithMetadata(file, folder = "employees") {
    if (!file) {
      throw new Error("No file provided");
    }

    const isVideo = file.type.startsWith("video/");
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Chi chap nhan file anh (JPG, PNG) hoac video (MP4, MOV)");
    }

    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(isVideo ? "Kich thuoc video khong duoc vuot qua 100MB" : "Kich thuoc anh khong duoc vuot qua 5MB");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    const resourceType = isVideo ? "video" : "image";

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Khong the upload file. Vui long thu lai.");
    }
  },
};
