import zipfile
import os

zip_path = 'jgphnjokjhjlcnnajmfjlacjnjkhleah.zip'
out_dir = 'gwdang_extracted'

if os.path.exists(zip_path):
    os.makedirs(out_dir, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(out_dir)
        print(f"Extracted successfully to {out_dir}")
        # List top level files
        print("Files extracted:")
        for f in os.listdir(out_dir):
            print(f" - {f}")
    except Exception as e:
        print(f"Error extracting: {e}")
else:
    print(f"File {zip_path} not found.")
