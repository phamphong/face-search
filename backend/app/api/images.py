from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from app.db.session import get_db
from app.db.models import Image, Face, Person
from app.api.schemas import ImageResponse, ImageSearchResponse
from app.services.storage import storage_service
from app.ai.face_service import face_service
import uuid
import asyncio
import math
import os
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=ImageResponse)
async def upload_image(
  file: UploadFile = File(...),
  db: Session = Depends(get_db)
):
    """
    Upload a single image for search.
    Image will be scanned for faces, recognized against existing persons, and indexed.
    """
    # 1. Save
    try:
        saved_path = storage_service.save_file(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    # 2. Detect
    try:
        faces = await face_service.detect_faces_async(saved_path)
    except Exception as e:
        # cleanup
        os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {e}")
        
    # 3. Create Image Record
    db_image = Image(file_path=saved_path, is_sample=False)
    db.add(db_image)
    db.flush()
    
    # 4. Process Faces
    THRESHOLD = 0.5
    
    for face in faces:
        embedding = face.embedding
        
        # Find nearest person
        search_embedding = embedding.tolist()

        distance_col = Face.embedding.cosine_distance(search_embedding).label('distance')

        result = db.query(
            Face.person_id,
            distance_col
        ).filter(
            Face.person_id != None
        ).order_by(
            distance_col
        ).limit(1).first()
        
        matched_person_id = None
        if result:
            distance = result[1]
            if distance < THRESHOLD:
                matched_person_id = result[0]
        
        # Save Face
        db_face = Face(
            image_id=db_image.id,
            person_id=matched_person_id,
            embedding=embedding,
            box=face.bbox.astype(int).tolist()
        )
        db.add(db_face)
        
    db.commit()
    db.refresh(db_image)
    
    return db_image

@router.post("/batch", response_model=List[ImageResponse])
async def upload_batch(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Batch upload images for search.
    Images will be scanned for faces, recognized against existing persons, and indexed.
    """
    uploaded_images = []
    
    for file in files:
        # 1. Save
        try:
            saved_path = storage_service.save_file(file)
        except Exception as e:
            print(f"Failed to save {file.filename}: {e}")
            continue
            
        # 2. Detect
        try:
            faces = await face_service.detect_faces_async(saved_path)
        except Exception as e:
            print(f"Failed to detect {file.filename}: {e}")
            continue
            
        # 3. Create Image Record
        db_image = Image(file_path=saved_path, is_sample=False)
        db.add(db_image)
        db.flush()
        
        # 4. Process Faces
        THRESHOLD = 0.5
        
        for face in faces:
            embedding = face.embedding
            
            # Find nearest person
            # Reuse logic from recognition.py? Ideally refactor to service.
            # For now, duplicate snippet for speed.
            
            # Only checking against samples? Or all faces?
            # Typically recognition checks against "known persons". 
            # In our DB, persons are defined by Faces linked to them.
            # So we query nearest face that HAS a person_id.

            # query = text("""
            #     SELECT f.person_id, f.embedding <=> :embedding as distance
            #     FROM faces f
            #     WHERE f.person_id IS NOT NULL
            #     ORDER BY distance ASC
            #     LIMIT 1
            # """)
            
            # result = db.execute(query, {"embedding": str(embedding.tolist())}).first()
            search_embedding = embedding.tolist()

            distance_col = Face.embedding.cosine_distance(search_embedding).label('distance')

            result = db.query(
                Face.person_id,
                distance_col
            ).filter(
                Face.person_id != None
            ).order_by(
                distance_col
            ).limit(1).first()
            
            matched_person_id = None
            if result:
                distance = result[1]
                if distance < THRESHOLD:
                    matched_person_id = result[0]
            
            # Save Face
            db_face = Face(
                image_id=db_image.id,
                person_id=matched_person_id,
                embedding=embedding,
                box=face.bbox.astype(int).tolist()
            )
            db.add(db_face)
            
        db.commit()
        db.refresh(db_image)
        uploaded_images.append(db_image)

    return uploaded_images

@router.get("/", response_model=ImageSearchResponse)
def search_images(
    person_id: Optional[List[uuid.UUID]] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search images with pagination.
    If person_id is provided, return images containing ANY of these persons.
    """
    query = db.query(Image)

    if person_id:
        # Join with Face table to filter by person_id
        query = query.join(Face).filter(Face.person_id.in_(person_id))
    
    # Filter out samples
    query = query.filter(Image.is_sample == False)

    # Dedup images if multiple faces match in the same image
    query = query.distinct()
    
    # Count total (inefficient for large datasets but ok for demo)
    total = query.count()
    
    # Pagination
    offset = (page - 1) * size
    images = query.options(joinedload(Image.faces).joinedload(Face.person)).order_by(Image.created_at.desc()).offset(offset).limit(size).all()
    
    pages = math.ceil(total / size)
    
    return {
        "items": images,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/by-name", response_model=ImageSearchResponse)
def search_images_by_name(
    name: str = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search images containing ANY person matching the given name (partial match).
    """

    query = db.query(Image).join(Face).join(Person)
    
    if name:
        query = query.filter(Person.name.ilike(f"%{name}%"))
        
    query = query.filter(Image.is_sample == False).distinct()

    total = query.count()
    offset = (page - 1) * size

    images = query.options(joinedload(Image.faces).joinedload(Face.person)).order_by(Image.created_at.desc()).offset(offset).limit(size).all()
    
    pages = math.ceil(total / size)

    return {
        "items": images,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }