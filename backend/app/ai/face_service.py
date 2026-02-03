import insightface
from insightface.app import FaceAnalysis
import numpy as np
import cv2
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

class FaceService:
    def __init__(self, model_name='buffalo_l', ctx_id=0):
        # ctx_id=0 for GPU, -1 for CPU. 
        # Attempt to use CPU if GPU won't work or if strictly requested, 
        # but insightface usually handles providers based on installed onnxruntime.
        # If onnxruntime-gpu is not installed, it falls back to CPU.
        self.app = FaceAnalysis(name=model_name)
        self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))
        self.executor = ThreadPoolExecutor(max_workers=4)

    def detect_faces(self, image_path):
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")
        
        faces = self.app.get(img)
        return faces

    async def detect_faces_async(self, image_path):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self.detect_faces, image_path)

    def get_embedding(self, image_path):
        faces = self.detect_faces(image_path)
        if not faces:
            return None
        # Sort by size (area) to get the main face if multiple
        faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        return faces[0].embedding

    async def get_embedding_async(self, image_path):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self.get_embedding, image_path)

    def compute_similarity(self, embedding1, embedding2):
        # InsightFace embeddings are normalized, so dot product = cosine similarity
        # But let's be explicit if needed. 
        # Typically: sum(a*b) / (norm(a)*norm(b))
        # If they are normalized: sum(a*b)
        # Verify normalization:
        # np.linalg.norm(faces[0].embedding) is usually close to 1.0 in ArcFace/InsightFace
        return np.dot(embedding1, embedding2)

# Singleton instance
face_service = FaceService(ctx_id=-1) # Default to CPU for safety in this setup
