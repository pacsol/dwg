# DWG Dashboard Prototype

A web-based dashboard for analyzing and visualizing DWG/DXF CAD files.

## Features

- **File Upload**: Drag-and-drop upload for DWG and DXF files
- **Layer Analysis**: View all layers with colors, visibility, and entity counts
- **Measurements**: Extract bounding boxes, line lengths, areas, and dimensions
- **2D Preview**: Interactive canvas visualization with pan support

## Tech Stack

- **Backend**: Python + FastAPI + ezdxf
- **Frontend**: React + TypeScript + Vite
- **Visualization**: HTML5 Canvas

## Project Structure

```
/root/dwg-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Pydantic schemas
│   │   └── dwg_service.py       # DWG/DXF processing
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── LayerPanel.tsx
│   │   │   ├── MeasurementsPanel.tsx
│   │   │   └── PreviewCanvas.tsx
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
└── sample.dxf                   # Test file
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+

### Backend Setup

```bash
cd /root/dwg-dashboard/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd /root/dwg-dashboard/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload DWG/DXF file |
| `/api/files/{id}/layers` | GET | Get layer information |
| `/api/files/{id}/measurements` | GET | Get measurements data |
| `/api/files/{id}/preview` | GET | Get preview geometry |

## Testing

1. Start both backend and frontend servers
2. Open browser to `http://localhost:3000`
3. Drag and drop the sample file `sample.dxf` or any DWG/DXF file
4. View layers, measurements, and 2D preview

## Supported Entities

The preview renderer supports:
- LINE
- LWPOLYLINE (with closed fill)
- CIRCLE
- ARC
- TEXT / MTEXT
- HATCH (boundaries)

## Notes

- Files are stored temporarily in `/tmp/uploads/`
- DWG files are processed using ezdxf (may have limited support)
- For best results, use DXF format
- File metadata is stored in memory (resets on server restart)

## Development

### Backend Development

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm run dev
```

## Building for Production

### Backend
No build step required. Deploy with:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build
# Output in dist/ folder
```

## License

Prototype for demonstration purposes.
