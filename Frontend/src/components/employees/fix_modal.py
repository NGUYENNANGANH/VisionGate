import re

file_path = r'd:\doan\VisionGate\Frontend\src\components\employees\EmployeeModal.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add ANGLES constant outside component
if 'const ANGLES =' not in content:
    content = content.replace('function EmployeeModal(', '''const ANGLES = [
  { id: 'Front', label: 'Trực diện' },
  { id: 'Left', label: 'Mặt trái' },
  { id: 'Right', label: 'Mặt phải' },
  { id: 'Up', label: 'Nhìn lên' },
  { id: 'Down', label: 'Nhìn xuống' }
];

function EmployeeModal(''')

# Replace handleBulkFaceUpload and the drag handlers
old_methods = r'''  const handleBulkFaceUpload = async \(e\) => \{.*?(?=  const handleDeleteFace = async)'''
new_methods = '''  const handleAngleFaceUpload = async (e, angle) => {
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
        isPrimary: faces.length === 0 && angle === 'Front',
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
  };

'''
content = re.sub(old_methods, new_methods, content, flags=re.DOTALL)

# Delete drag handlers
drag_handlers = r'''  const handleDragOver = \(e\) => \{.*?  \};\n\n  const handleDragLeave = \(e\) => \{.*?  \};\n\n  const handleDrop = \(e\) => \{.*?  \};\n\n'''
content = re.sub(drag_handlers, '', content, flags=re.DOTALL)

# Replace the JSX part
old_jsx = r'''              \{employee && \(\n                <div className="form-group full-width">\n                  <div className="face-manager">.*?</div>\n                </div>\n              \)\}'''

new_jsx = '''              {employee && (
                <div className="form-group full-width">
                  <div className="face-manager">
                    <div className="face-manager-head">
                      <label>Ảnh nhận diện theo góc</label>
                      <span>{faces.length}/5 ảnh</span>
                    </div>

                    {facesLoading ? (
                      <div className="face-empty">Đang tải ảnh...</div>
                    ) : (
                      <div className="face-grid-angles">
                        {ANGLES.map((angleObj) => {
                          const faceForAngle = faces.find(f => f.angle === angleObj.id);
                          return (
                            <div className="face-angle-card" key={angleObj.id}>
                              <div className="face-angle-label">{angleObj.label}</div>
                              {faceForAngle ? (
                                <div className="face-item">
                                  <img src={faceForAngle.faceImageUrl} alt={angleObj.label} />
                                  {faceForAngle.isPrimary && <span className="face-primary">Chính</span>}
                                  <button
                                    type="button"
                                    className="face-delete"
                                    onClick={() => handleDeleteFace(faceForAngle.id)}
                                    title="Xóa ảnh"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="face-upload-box">
                                  <label className="face-upload-label" disabled={bulkUploading}>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      onChange={(e) => handleAngleFaceUpload(e, angleObj.id)}
                                      style={{ display: "none" }}
                                      disabled={bulkUploading}
                                    />
                                    <Plus size={16} />
                                    <span>Thêm ảnh</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {bulkUploading && <div className="upload-progress-text">{uploadProgress}</div>}
                  </div>
                </div>
              )}'''

content = re.sub(old_jsx, new_jsx, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
