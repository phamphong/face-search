from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Person, Image, Face
from app.api.schemas import PersonCreate, PersonResponse, ImageResponse, PersonFromFace
from app.services.storage import storage_service
from app.ai.face_service import face_service
import uuid
import os

router = APIRouter()

@router.post("/", response_model=PersonResponse)
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    db_person = Person(name=person.name)
    db.add(db_person)
    try:
        db.commit()
        db.refresh(db_person)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Person already exists")
    return db_person

@router.post("/from-face", response_model=PersonResponse)
def create_person_from_face(data: PersonFromFace, db: Session = Depends(get_db)):
    # 1. Get Face
    face = db.query(Face).filter(Face.id == data.face_id).first()
    if not face:
        raise HTTPException(status_code=404, detail="Face not found")
    if face.person_id:
        raise HTTPException(status_code=400, detail="Face already assigned to a person")

    # 2. Check Name
    existing = db.query(Person).filter(Person.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Person name already exists")
    
    # 3. Create Person
    new_person = Person(name=data.name)
    db.add(new_person)
    db.flush()
    
    # 4. Assign this face
    face.person_id = new_person.id
    
    # 5. Find similar UNKNOWN faces and assign (re-identification)
    THRESHOLD = 0.5 
    
    # Ensure embedding is compatible with pgvector query (list)
    search_embedding = face.embedding
    if hasattr(search_embedding, 'tolist'):
        search_embedding = search_embedding.tolist()
    
    similar_faces = db.query(Face).filter(
        Face.person_id.is_(None),
        Face.id != face.id,
        Face.embedding.cosine_distance(search_embedding) < THRESHOLD
    ).all()
    
    for f in similar_faces:
        f.person_id = new_person.id
        
    db.commit()
    db.refresh(new_person)
    return new_person

@router.get("/", response_model=list[PersonResponse])
def read_persons(skip: int = 0, limit: int = 100, name: str = None, db: Session = Depends(get_db)):
    query = db.query(Person)
    if name:
        query = query.filter(Person.name.ilike(f"%{name}%"))
    persons = query.offset(skip).limit(limit).all()
    return persons

@router.get("/{person_id}", response_model=PersonResponse)
def read_person(person_id: uuid.UUID, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person

@router.delete("/{person_id}")
def delete_person(person_id: uuid.UUID, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Set person_id to NULL for all faces linked to this person
    db.query(Face).filter(Face.person_id == person.id).update({Face.person_id: None})

    db.delete(person)
    db.commit()
    return {"ok": True}

@router.post("/{person_id}/images")
async def upload_person_image(
    person_id: uuid.UUID, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # 1. Save file
    # Ensure storage service uses correct relative path for saving, 
    # dependent on where the app is run from.
    # Adjusting storage service path if needed or just use relative "storage"
    
    # NOTE: The storage_service was init with "backend/storage" which might be double nested
    # if we run from backend root. Let's fix that instantiation in storage.py or main.py
    # Assumed we run from `backend/` folder.
    
    try:
        # Save temp file or permanent file right away? 
        # Requirement: Save local (dev)
        saved_path = storage_service.save_file(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    # 2. Detect & Encode
    try:
        # face_service.get_embedding expects a path string
        embedding = await face_service.get_embedding_async(saved_path)
        if embedding is None:
            # Clean up image if no face found? Maybe keep it for debug?
            # For now, error out
            os.remove(saved_path)
            raise HTTPException(status_code=400, detail="No face detected in image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {e}")

    # 3. Save to DB
    try:
        # Create Image record
        db_image = Image(file_path=saved_path, is_sample=True)
        db.add(db_image)
        db.flush() # get id

        # Create Face record
        db_face = Face(
            image_id=db_image.id,
            person_id=person.id,
            embedding=embedding # pgvector handles numpy array
        )
        db.add(db_face)
        db.commit()
        
        return {"message": "Image uploaded and face encoded", "image_id": db_image.id, "face_id": db_face.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
