import os
import urllib.request

def download_file(url, filename):
    if not os.path.exists(filename):
        print("Downloading " + filename + "...")
        try:
            urllib.request.urlretrieve(url, filename)
            print("Done downloading " + filename)
        except Exception as e:
            print("Error downloading " + filename + ": " + str(e))
    else:
        print("File " + filename + " already exists.")

if __name__ == "__main__":
    print("=== DOWNLOADING OPENCV YUNET & SFACE MODELS ===")
    download_file(
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "face_detection_yunet_2023mar.onnx"
    )
    download_file(
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "face_recognition_sface_2021dec.onnx"
    )
    print("Complete!")
