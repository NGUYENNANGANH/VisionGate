import os

file_path = r'd:\doan\VisionGate\Frontend\src\components\employees\EmployeeModal.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_css = '''
.face-grid-angles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
}

.face-angle-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #e2e8f0;
}

.face-angle-label {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  color: #334155;
}

.face-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 8px;
  cursor: pointer;
  color: #2563eb;
}

.face-upload-label[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-progress-text {
  font-size: 13px;
  color: #2563eb;
  font-weight: 500;
  text-align: center;
  margin-top: 8px;
}
'''

content += new_css

# fix face-upload-box width/height inside card
content = content.replace('.face-upload-box {', '.face-upload-box {\n  flex: 1;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
