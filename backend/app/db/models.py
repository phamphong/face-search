from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY, INTEGER
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid
from .session import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())

    faces = relationship("Face", back_populates="person")

    @property
    def face_count(self):
        return len(self.faces)

class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_path = Column(String, nullable=False)
    is_sample = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    faces = relationship("Face", back_populates="image")

class Face(Base):
    __tablename__ = "faces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id"))
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)
    
    # Note: InsightFace 'buffalo_l' uses ArcFace R50 which produces 512-dimensional embeddings.
    embedding = Column(Vector(512)) 
    
    # Store bounding box as [x1, y1, x2, y2]
    box = Column(ARRAY(INTEGER), nullable=True)

    created_at = Column(DateTime, default=func.now())
    
    # Add IVFFlat index for faster cosine distance search
    # Note: 'lists' parameter should ideally be ~ sqrt(rows). 100 is good for up to ~10k rows.
    # vector_cosine_ops is required for the <=> operator.
    __table_args__ = (
        Index(
            'ix_faces_embedding',
            'embedding',
            postgresql_using='ivfflat',
            postgresql_with={'lists': 100},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )

    image = relationship("Image", back_populates="faces")
    person = relationship("Person", back_populates="faces")

    @property
    def person_name(self):
        return self.person.name if self.person else None
