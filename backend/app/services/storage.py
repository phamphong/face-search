import shutil
import os
import uuid
from fastapi import UploadFile

class StorageService:
    def __init__(self, upload_dir="storage"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_file(self, file: UploadFile) -> str:
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return file_path

# Initialize with a path relative to where app assumes CWD is.
# If running `uvicorn app.main:app` from `backend/`, then `storage` is `backend/storage`
storage_service = StorageService(upload_dir="storage")
