# Face Search Frontend

The modern web interface for the Face Search application, built with React and Rsbuild for high performance.

## 💻 Tech Stack

- **React 19**: Latest React features.
- **Rsbuild**: Fast build system (Rust-based).
- **Tailwind CSS v4**: Utility-first CSS framework.
- **Radix UI**: Accessible, unstyled UI primitives (Progress, Dialogs, etc.).
- **TanStack Query**: Powerful asynchronous state management.
- **Lucide React**: Beautiful icons.

## 🛠 Setup & Run

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
cd frontend
npm install
```

### Development

Start the development server:

```bash
npm run dev
```
App runs at `http://localhost:3000` by default.

### Build

Build for production:

```bash
npm run build
```

## 🔧 Environment Variables

Create a `.env` file if you need to override defaults (Rsbuild usually handles this, but for API URL):

```
PUBLIC_API_URL=http://localhost:8000
```
