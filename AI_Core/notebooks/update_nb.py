import json

file_path = r"d:\doan\VisionGate\AI_Core\notebooks\Train_YOLO11_PPE.ipynb"
with open(file_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

for cell in nb["cells"]:
    if cell["cell_type"] == "code":
        source = "".join(cell["source"])
        if "results = model.train(" in source:
            new_source = [
                "model = YOLO('yolo11s.pt')\n",
                "\n",
                "yaml_path = f\"{dataset.location}/data.yaml\"\n",
                "\n",
                "results = model.train(\n",
                "    data=yaml_path,\n",
                "    epochs=150,       # tang epoch vi co augmentation manh\n",
                "    imgsz=960,        # tang imgsz de nhan dien vat nho\n",
                "    batch=8,          # giam batch xuong 8 de tranh OOM\n",
                "    patience=50,      # tang patience\n",
                "    seed=42,\n",
                "    name='yolo11_ppe_aug',\n",
                "    mosaic=1.0,\n",
                "    mixup=0.1,\n",
                "    copy_paste=0.1,\n",
                "    degrees=15.0,\n",
                "    hsv_s=0.2,\n",
                "    hsv_v=0.2\n",
                ")"
            ]
            cell["source"] = new_source
            
        elif "RUN = 'runs/detect/yolo11_ppe'" in source:
            new_source = [
                "from IPython.display import Image, display\n",
                "RUN = 'runs/detect/yolo11_ppe_aug'\n",
                "display(Image(filename=f'{RUN}/results.png'))\n",
                "display(Image(filename=f'{RUN}/confusion_matrix_normalized.png'))"
            ]
            cell["source"] = new_source

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)
    f.write("\n") # Jupyter format
