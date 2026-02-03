from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class PersonBase(BaseModel):
    name: str

class PersonCreate(PersonBase):
    pass

class PersonFromFace(BaseModel):
    name: str
    face_id: UUID

class PersonResponse(PersonBase):
    id: UUID
    created_at: datetime
    face_count: int = 0

    class Config:
        from_attributes = True

class FaceResponse(BaseModel):
    id: UUID
    person_id: Optional[UUID]
    person_name: Optional[str] = None
    box: Optional[List[int]]

    class Config:
        from_attributes = True

class ImageResponse(BaseModel):
    id: UUID
    file_path: str
    created_at: datetime
    is_sample: bool = False
    faces: List[FaceResponse] = []

    class Config:
        from_attributes = True

class ImageSearchResponse(BaseModel):
    items: List[ImageResponse]
    total: int
    page: int
    size: int
    pages: int

class FaceRecognition(BaseModel):
    box: List[int]
    person: str
    distance: float

class RecognitionResponse(BaseModel):
    faces: List[FaceRecognition]
