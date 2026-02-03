from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text
from app.db.session import engine, Base
from app.api import persons, recognition, images
from fastapi.staticfiles import StaticFiles
from typing import AsyncGenerator

load_dotenv()

async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Attempt to create extension and tables
  try:
    with engine.connect() as connection:
      connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
      connection.commit()
      print("Enabled pgvector extension")
  except Exception as e:
    print(f"Error creating extension: {e}")
  
  # Create tables
  Base.metadata.create_all(bind=engine)
  print("Database tables created")

  yield # The application will now start processing requests

  # Code to run on application shutdown
  print("Application shutting down...")

app = FastAPI(title="Face Search API", lifespan=lifespan)

# Mount storage for static access
# Ensure "storage" directory exists relative to execution path
app.mount("/static", StaticFiles(directory="storage"), name="static")

origins = [
  "http://localhost",
  "http://localhost:3000"
]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.include_router(persons.router, prefix="/persons", tags=["persons"])
app.include_router(images.router, prefix="/images", tags=["images"])
app.include_router(recognition.router, tags=["recognition"])

@app.get("/")
def read_root():
  return {"message": "Face Search API is running"}
