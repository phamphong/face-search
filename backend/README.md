# Face Search Backend

The RESTful API for the Face Search system, powered by FastAPI and InsightFace.

## 🧠 Features

- **Batch Image Upload**: Accepts multiple images, detects faces using AI models.
- **Face Recognition**: Generates 512-dimensional embeddings for detected faces.
- **Vector Search**: Finds similar faces using Cosine Distance via `pgvector` in PostgreSQL.
- **Metadata Management**: Stores image paths.

### 🔍 How Face Detection Works

The system uses the **InsightFace** library with the `buffalo_l` model pack to perform face analysis:

1.  **Preprocessing**: Images are loaded using OpenCV and resized for optimal detection (`det_size=(640, 640)`).
2.  **Detection (SCRFD)**: The app identifies face locations (bounding boxes) and 5 facial landmarks (eyes, nose, mouth) even in crowded or side-angle photos.
3.  **Recognition (ArcFace)**: detected faces are aligned/cropped and passed through a ResNet50-based model to generate a **512-dimensional vector embedding**.
4.  **Indexing**: This embedding acts as a unique biometric signature used for similarity search in the database.

## ⚙️ Requirements

- **Python 3.10 - 3.12** (Required for `onnxruntime` compatibility).
- **Visual C++ Build Tools** (Windows only, for compiling specific python wheels).
- **PostgreSQL** with `pgvector` extension enabled.

## 🚀 Setup & Run

### 1. Environment Setup

```bash
# Create venv
python -m venv venv

# Activate venv
# Windows (Git Bash):
source venv/Scripts/activate
# Windows (PowerShell):
# .\venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Database Configuration

Ensure your `docker-compose.yml` in the root is running (`docker-compose up -d`).
The app connects to `postgresql://postgres:password@localhost:5432/facesearch` by default (configurable in `.env`).

### 4. Run Server

```bash
uvicorn app.main:app --reload
```
Server runs at `http://localhost:8000`.
Docs available at `http://localhost:8000/docs`.

## 📂 Key Files

- **`app/main.py`**: Application entry point.
- **`app/api/images.py`**: Image upload and search endpoints.
- **`app/ai/face_service.py`**: Wrapper for `insightface` logic.
- **`app/db/models.py`**: SQLAlchemy models (`Face`, `Image`, `Person`).

## 📊 Database Schema

- **images**: Stores file path and sample status.
- **faces**: Stores bounding box, person_id link, and **vector embedding**.
- **persons**: Groups faces under a unique identity.
