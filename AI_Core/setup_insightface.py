import urllib.request
import zipfile
import os
import shutil

def setup():
    url = "https://github.com/deepinsight/insightface/archive/refs/heads/master.zip"
    zip_path = "insightface.zip"
    extract_dir = "insightface_master"
    target_dir = "insightface"
    
    if os.path.exists(target_dir):
        print(f"Directory {target_dir} already exists.")
        return

    print("Downloading InsightFace from GitHub...")
    urllib.request.urlretrieve(url, zip_path)
    
    print("Extracting...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
        
    print("Copying insightface module...")
    source_dir = os.path.join(extract_dir, "insightface-master", "python-package", "insightface")
    shutil.copytree(source_dir, target_dir)
    
    print("Removing 3D C++ module (cause of Build Tools error)...")
    cython_dir = os.path.join(target_dir, "thirdparty", "face3d")
    if os.path.exists(cython_dir):
        shutil.rmtree(cython_dir)
        
    thirdparty_init = os.path.join(target_dir, "thirdparty", "__init__.py")
    if os.path.exists(thirdparty_init):
        with open(thirdparty_init, "w") as f:
            f.write("") 
            
    print("Cleaning up...")
    os.remove(zip_path)
    shutil.rmtree(extract_dir)
    
    print("SETUP INSIGHTFACE LOCAL COMPLETE!")

if __name__ == "__main__":
    setup()
