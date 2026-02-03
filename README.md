# Face Search System

A full-stack application for face recognition and semantic search. It detects faces in uploaded images, generates vector embeddings, and allows searching for people or specific faces within the database.

## 🚀 Features

- **Face Detection & Indexing**: Automatically detects faces in images using `insightface`.
- **Vector Search**: Uses `pgvector` to store and search face embeddings (Cosine Distance).
- **Batch Upload**: Upload multiple images with real-time progress tracking, face detection status, and concurrent processing.
- **Person Management**: Group faces by person.
- **Search by Name**: Find images associated with a specific person.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Rsbuild
- **Styling**: Tailwind CSS, Radix UI
- **State Management**: TanStack Query
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL with `pgvector` extension
- **ORM**: SQLAlchemy
- **AI/ML**: InsightFace, ONNX Runtime
- **Validation**: Pydantic

### Infrastructure
- **Containerization**: Docker (for Database)
- **Environment**: Python Virtualenv, Node.js

## 🏁 Quick Start

### 1. Prerequisites
- **Docker** & Docker Compose (for the database)
- **Python 3.10 - 3.12** (Important: `insightface`/`onnxruntime` support)
- **Node.js** (v18+) & `npm` or `pnpm`

### 2. Start the Database
Start the PostgreSQL instance with `pgvector`.
```bash
docker-compose up -d
```

### 3. Setup Backend
Open a terminal for the backend:
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows Git Bash)
source venv/Scripts/activate
# Activate (Windows PowerShell)
# .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`.

### 4. Setup Frontend
Open a new terminal for the frontend:
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The UI will be available at `http://localhost:3000`.

## 📂 Project Structure

```
face-search/
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/        # API endpoints
│   │   ├── ai/         # Face detection service
│   │   └── db/         # Database models & connection
│   └── storage/        # Local storage for uploaded images
├── frontend/           # React application
│   ├── src/
│   │   ├── api/        # API integration
│   │   ├── components/ # UI Components
│   │   └── lib/        # Utilities
├── docker-compose.yml  # Database configuration
└── README.md
```
