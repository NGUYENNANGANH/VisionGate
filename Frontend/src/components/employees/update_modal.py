import os

file_path = r'd:\doan\VisionGate\Frontend\src\components\employees\EmployeeModal.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1: dataToSend inside handleSubmit
old_data_to_send = """      const dataToSend = {
        ...formData,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
      };"""
new_data_to_send = """      const dataToSend = {
        ...formData,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
        newFaces: !employee ? faces : undefined,
      };"""
content = content.replace(old_data_to_send, new_data_to_send)

# Replace 2: handleAngleFaceUpload
old_handle_upload = """  const handleAngleFaceUpload = async (e, angle) => {
    if (!e.target.files || e.target.files.length === 0 || !employee) return;
    const file = e.target.files[0];
    
    setUploadProgress(`Đang tải ảnh ${angle}...`);
    setBulkUploading(true);
    setError("");

    try {
      const uploaded = await uploadService.uploadImageWithMetadata(
        file,
        `employees/${employee.employeeId}`
      );

      await api.post(`/employees/${employee.employeeId}/faces`, {
        faceImageUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId || null,
        isPrimary: angle === 'Front',
        angle: angle
      });

      setUploadProgress("");
      await loadFaces(employee.employeeId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không thêm được ảnh nhận diện.");
    } finally {
      setBulkUploading(false);
      e.target.value = "";
    }
  };"""
new_handle_upload = """  const handleAngleFaceUpload = async (e, angle) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadProgress(`Đang tải ảnh ${angle}...`);
    setBulkUploading(true);
    setError("");

    try {
      const uploaded = await uploadService.uploadImageWithMetadata(
        file,
        employee ? `employees/${employee.employeeId}` : "employees/temp"
      );

      if (employee) {
        await api.post(`/employees/${employee.employeeId}/faces`, {
          faceImageUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId || null,
          isPrimary: angle === 'Front',
          angle: angle
        });
        await loadFaces(employee.employeeId);
      } else {
        setFaces((prev) => {
          const existing = prev.filter(f => f.angle !== angle);
          return [...existing, {
            id: Date.now() + Math.random(),
            faceImageUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId || null,
            isPrimary: angle === 'Front',
            angle: angle,
            isNew: true
          }];
        });
        if (angle === 'Front') {
          setFormData((prev) => ({ ...prev, faceImageUrl: uploaded.url }));
        }
      }

      setUploadProgress("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không thêm được ảnh nhận diện.");
    } finally {
      setBulkUploading(false);
      e.target.value = "";
    }
  };"""
content = content.replace(old_handle_upload, new_handle_upload)

# Replace 3: handleDeleteFace
old_handle_delete = """  const handleDeleteFace = async (faceId) => {
    if (!employee) return;
    if (!window.confirm("Xoa anh nhan dien nay?")) return;

    setError("");
    try {
      await api.delete(`/employees/${employee.employeeId}/faces/${faceId}`);
      await loadFaces(employee.employeeId);
    } catch (err) {
      setError(err.response?.data?.message || "Khong xoa duoc anh nhan dien.");
    }
  };"""
new_handle_delete = """  const handleDeleteFace = async (faceId) => {
    if (!window.confirm("Xóa ảnh nhận diện này?")) return;

    if (employee) {
      setError("");
      try {
        await api.delete(`/employees/${employee.employeeId}/faces/${faceId}`);
        await loadFaces(employee.employeeId);
      } catch (err) {
        setError(err.response?.data?.message || "Không xóa được ảnh nhận diện.");
      }
    } else {
      setFaces((prev) => prev.filter(f => f.id !== faceId));
    }
  };"""
content = content.replace(old_handle_delete, new_handle_delete)

# Replace 4: Grid UI
old_ui_start = """              {/* Image Upload - THÊM MỚI */}
              {!employee && (
              <div className="form-group full-width">
                <ImageUpload
                  value={formData.faceImageUrl}
                  onChange={handleImageChange}
                  label="Ảnh khuôn mặt"
                />
              </div>
              )}

              {employee && (
                <div className="form-group full-width">
                  <div className="face-manager">
                    <div className="face-manager-head">
                      <label>Ảnh nhận diện theo góc</label>
                      <span>{faces.length}/5 ảnh</span>
                    </div>"""
new_ui_start = """              {/* Bỏ mục ImageUpload cũ, sử dụng chung Grid 5 ảnh cho cả thêm mới và chỉnh sửa */}
              <div className="form-group full-width">
                <div className="face-manager">
                  <div className="face-manager-head">
                    <label>Ảnh nhận diện theo góc (Bắt buộc phải có ảnh Trực diện)</label>
                    <span>{faces.length}/5 ảnh</span>
                  </div>"""
content = content.replace(old_ui_start, new_ui_start)

# Replace 5: End of employee condition
old_ui_end = """                  </div>
                </div>
              )}"""
new_ui_end = """                  </div>
                </div>"""
content = content.replace(old_ui_end, new_ui_end)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("EmployeeModal.jsx updated successfully!")
