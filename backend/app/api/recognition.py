from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.db.models import Face, Person
from app.services.storage import storage_service
from app.ai.face_service import face_service
from app.api.schemas import RecognitionResponse, FaceRecognition
import os
import shutil

router = APIRouter()

@router.post("/recognize", response_model=RecognitionResponse)
async def recognize_faces(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Save file
    try:
        saved_path = storage_service.save_file(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    # 2. Detect & Encode all faces
    try:
        faces = await face_service.detect_faces_async(saved_path)
    except Exception as e:
        # cleanup
        os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {e}")

    results = []
    
    # Threshold for recognition (0.6 is a common starting point for ArcFace Cosine Distance)
    # The TODO suggests 0.4-0.6.
    THRESHOLD = 0.5

    for face in faces:
        # face.bbox is [x1, y1, x2, y2]
        bbox = face.bbox.astype(int).tolist()
        # Convert to [x, y, w, h]
        x, y, w, h = bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]
        
        embedding = face.embedding
        
        # 3. Search in DB
        # We use the <=> operator for Cosine Distance
        # We want the single closest match across all faces in DB
        # Note: We query the 'faces' table, but we want the 'Person' details.
        
        # SQL equivalent:
        # SELECT f.id, f.person_id, p.name, f.embedding <=> :emb as distance
        # FROM faces f
        # JOIN persons p ON f.person_id = p.id
        # ORDER BY distance ASC
        # LIMIT 1
        
        query = text("""
            SELECT f.id, f.person_id, p.name, f.embedding <=> :embedding as distance
            FROM faces f
            JOIN persons p ON f.person_id = p.id
            ORDER BY distance ASC
            LIMIT 1
        """)
        
        # pgvector expects a list or array for the vector
        result = db.execute(query, {"embedding": str(embedding.tolist())}).first()
        
        person_name = "Unknown"
        distance = 1.0 # Max distance
        
        if result:
            # result is (id, person_id, name, distance)
            db_distance = result[3]
            if db_distance < THRESHOLD:
                person_name = result[2]
                distance = db_distance
            else:
                # Found a nearest neighbor, but it's too far
                distance = db_distance 
        
        results.append(FaceRecognition(
            box=[x, y, w, h],
            person=person_name,
            distance=float(distance)
        ))

    return RecognitionResponse(faces=results)
