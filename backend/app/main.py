"""FastAPI main application for DWG Dashboard"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from typing_extensions import Self
import os
import uuid
import shutil

app = FastAPI(
    title="DWG Dashboard API",
    description="API for processing and visualizing DWG/DXF files",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://dwg-one.vercel.app", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for file metadata (use database in production)
file_storage = {}
UPLOAD_DIR = "/tmp/uploads"

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Pydantic Models
class LayerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    color: int
    color_name: str
    visible: bool
    entity_count: int
    line_length: float
    closed_area: float = 0.0


class BoundingBox(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float
    width: float
    height: float
    depth: float


class Measurements(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_entities: int
    bounding_box: BoundingBox
    total_line_length: float
    total_closed_area: float
    dimensions: List[dict]


class FileInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_size: int
    upload_time: datetime
    file_type: str


class UploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    success: bool
    file_id: str
    filename: str
    message: str


class LayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_id: str
    filename: str
    layers: List[LayerInfo]


class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_id: str
    filename: str
    measurements: Measurements


class GeometryEntity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: str
    layer: str
    color: int
    data: dict


class PreviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_id: str
    filename: str
    bounding_box: BoundingBox
    entities: List[GeometryEntity]


@app.get("/")
async def root():
    return {"message": "DWG Dashboard API", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a DWG or DXF file"""
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.dxf', '.dwg']:
        raise HTTPException(status_code=400, detail="Only .dxf and .dwg files are supported")

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        file_storage[file_id] = FileInfo(
            id=file_id,
            filename=filename,
            file_size=file_size,
            upload_time=datetime.now(),
            file_type=ext[1:].upper()
        )

        return UploadResponse(
            success=True,
            file_id=file_id,
            filename=filename,
            message=f"File uploaded successfully. ID: {file_id}"
        )

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")



def convert_dwg_to_dxf(dwg_path: str) -> str:
    """Convert DWG to DXF using ODA File Converter"""
    import subprocess
    import os

    dxf_path = dwg_path.replace('.dwg', '.dxf')
    # Check multiple possible locations for ODA File Converter
    oda_path = os.environ.get('ODA_CONVERTER_PATH', '/tmp/oda/ODAFileConverter')

    # Fallback locations
    if not os.path.exists(oda_path):
        for fallback in ['/tmp/oda/ODAFileConverter', '/opt/oda/ODAFileConverter', './ODAFileConverter']:
            if os.path.exists(fallback):
                oda_path = fallback
                break

    # Check if ODA converter exists
    if not os.path.exists(oda_path):
        # Try to find it in PATH
        result = subprocess.run(['which', 'ODAFileConverter'], capture_output=True, text=True)
        if result.returncode == 0:
            oda_path = result.stdout.strip()
        else:
            raise Exception("ODA File Converter not found. Please install it or convert DWG to DXF manually.")

    # ODAFileConverter syntax: "InputFolder" "OutputFolder" "ACAD2018" "ACAD2018" "DXF" "1" "1"
    # Version "ACAD2018" = AutoCAD 2018 format
    # Output type "DXF" = DXF format
    # "1" "1" = recursive, audit
    input_dir = os.path.dirname(dwg_path) or '.'
    output_dir = input_dir
    filename = os.path.basename(dwg_path)

    cmd = [
        oda_path,
        input_dir,
        output_dir,
        "ACAD2018",  # Input version (auto-detect)
        "ACAD2018",  # Output version
        "DXF",       # Output format
        "0",         # Recursive (0=no)
        "1"          # Audit (1=yes)
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"ODA conversion stderr: {result.stderr}")

        # Check if output file was created
        expected_dxf = os.path.splitext(dwg_path)[0] + '.dxf'
        if os.path.exists(expected_dxf):
            return expected_dxf
        else:
            raise Exception(f"Conversion failed. Output file not found: {expected_dxf}")
    except subprocess.TimeoutExpired:
        raise Exception("DWG conversion timed out")
    except Exception as e:
        raise Exception(f"DWG conversion failed: {e}")


def parse_dxf_file(filepath: str):
    """Parse a DXF/DWG file and return the document"""
    import ezdxf
    import os

    file_ext = os.path.splitext(filepath)[1].lower()

    try:
        if file_ext == '.dwg':
            # DWG is a proprietary binary format that requires external conversion
            # ezdxf can only read DXF (text-based) format natively
            raise HTTPException(
                status_code=400,
                detail="DWG files require conversion to DXF. Please convert your file using:\n"
                       "1. AutoCAD: SAVEAS → DXF format\n"
                       "2. FreeCAD: File → Export → DXF (free)\n"
                       "3. Online: anyconv.com, zamzar.com\n"
                       "4. Or use the sample.dxf file from our GitHub repo"
            )
        else:
            doc = ezdxf.readfile(filepath)
            return doc
    except Exception as e:
        print(f"Error parsing file {filepath}: {e}")
        return None


def get_color_name(color_index: int) -> str:
    """Get color name from AutoCAD color index"""
    color_names = {
        0: "ByBlock", 1: "Red", 2: "Yellow", 3: "Green", 4: "Cyan",
        5: "Blue", 6: "Magenta", 7: "White/Black", 8: "Dark Gray",
        9: "Light Gray", 10: "Light Red", 11: "Light Yellow",
        12: "Light Green", 13: "Light Cyan", 14: "Light Blue",
        15: "Light Magenta"
    }
    return color_names.get(color_index, f"Color {color_index}")


def extract_layers(doc):
    """Extract all layer information from the document"""
    import math
    layers = []
    msp = doc.modelspace()

    layer_entity_counts = {}
    layer_line_lengths = {}
    layer_closed_areas = {}

    for entity in msp:
        layer_name = entity.dxf.layer

        if layer_name not in layer_entity_counts:
            layer_entity_counts[layer_name] = 0
            layer_line_lengths[layer_name] = 0.0
            layer_closed_areas[layer_name] = 0.0

        layer_entity_counts[layer_name] += 1

        if entity.dxftype() == "LINE":
            start = entity.dxf.start
            end = entity.dxf.end
            length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
            layer_line_lengths[layer_name] += length

        elif entity.dxftype() == "LWPOLYLINE":
            points = list(entity.get_points())
            if len(points) > 1:
                length = 0
                area = 0
                for i in range(len(points)):
                    x1, y1 = points[i][0], points[i][1]
                    x2, y2 = points[(i + 1) % len(points)][0], points[(i + 1) % len(points)][1]
                    length += math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                    area += (x1 * y2) - (x2 * y1)
                layer_line_lengths[layer_name] += length
                if entity.closed:
                    layer_closed_areas[layer_name] += abs(area) / 2

        elif entity.dxftype() == "HATCH":
            try:
                area = entity.total_area
                layer_closed_areas[layer_name] += area
            except:
                pass

    for layer in doc.layers:
        name = layer.dxf.name
        color = layer.dxf.color
        visible = not layer.is_off()

        layers.append(LayerInfo(
            name=name,
            color=color,
            color_name=get_color_name(color),
            visible=visible,
            entity_count=layer_entity_counts.get(name, 0),
            line_length=round(layer_line_lengths.get(name, 0.0), 4),
            closed_area=round(layer_closed_areas.get(name, 0.0), 4)
        ))

    return layers


def calculate_bounding_box(doc):
    """Calculate the bounding box of all entities"""
    from ezdxf import bbox
    try:
        extents = bbox.extents(doc.modelspace())
        if extents:
            min_x, min_y, min_z = extents.extmin
            max_x, max_y, max_z = extents.extmax
            return BoundingBox(
                min_x=min_x, min_y=min_y, min_z=min_z,
                max_x=max_x, max_y=max_y, max_z=max_z,
                width=max_x - min_x,
                height=max_y - min_y,
                depth=max_z - min_z
            )
    except Exception as e:
        print(f"Error calculating bounding box: {e}")

    # Fallback
    msp = doc.modelspace()
    all_points = []

    for entity in msp:
        try:
            if entity.dxftype() == "LINE":
                all_points.append((entity.dxf.start[0], entity.dxf.start[1], 0))
                all_points.append((entity.dxf.end[0], entity.dxf.end[1], 0))
            elif hasattr(entity, 'get_points'):
                for point in entity.get_points():
                    all_points.append((point[0], point[1], 0))
        except:
            continue

    if all_points:
        min_x = min(p[0] for p in all_points)
        max_x = max(p[0] for p in all_points)
        min_y = min(p[1] for p in all_points)
        max_y = max(p[1] for p in all_points)
        min_z = min(p[2] for p in all_points)
        max_z = max(p[2] for p in all_points)

        return BoundingBox(
            min_x=min_x, min_y=min_y, min_z=min_z,
            max_x=max_x, max_y=max_y, max_z=max_z,
            width=max_x - min_x,
            height=max_y - min_y,
            depth=max_z - min_z
        )

    return BoundingBox(min_x=0, min_y=0, min_z=0, max_x=0, max_y=0, max_z=0, width=0, height=0, depth=0)


def extract_measurements(doc):
    """Extract all measurements from the document"""
    msp = doc.modelspace()
    total_entities = len(list(msp))

    bounding_box = calculate_bounding_box(doc)

    layers = extract_layers(doc)
    total_line_length = sum(layer.line_length for layer in layers)
    total_closed_area = sum(layer.closed_area for layer in layers)

    dimensions = []
    for entity in msp:
        if entity.dxftype() == "DIMENSION":
            try:
                dim_data = {
                    "type": entity.dxftype(),
                    "layer": entity.dxf.layer,
                    "text": entity.get_text(),
                    "actual_measurement": entity.get_actual_measurement(),
                    "dimstyle": entity.dxf.dimstyle,
                }
                if hasattr(entity.dxf, 'defpoint'):
                    dim_data["defpoint"] = entity.dxf.defpoint
                if hasattr(entity.dxf, 'text_midpoint'):
                    dim_data["text_midpoint"] = entity.dxf.text_midpoint
                dimensions.append(dim_data)
            except Exception as e:
                print(f"Error extracting dimension: {e}")

    return Measurements(
        total_entities=total_entities,
        bounding_box=bounding_box,
        total_line_length=round(total_line_length, 4),
        total_closed_area=round(total_closed_area, 4),
        dimensions=dimensions
    )


def extract_preview_geometry(doc):
    """Extract geometry data for 2D preview"""
    msp = doc.modelspace()
    entities = []

    bounding_box = calculate_bounding_box(doc)

    for entity in msp:
        entity_type = entity.dxftype()
        layer = entity.dxf.layer
        color = entity.dxf.color if hasattr(entity.dxf, 'color') else 7

        geom_data = {"type": entity_type, "layer": layer, "color": color, "data": {}}

        try:
            if entity_type == "LINE":
                geom_data["data"] = {
                    "start": [entity.dxf.start[0], entity.dxf.start[1]],
                    "end": [entity.dxf.end[0], entity.dxf.end[1]]
                }
                entities.append(GeometryEntity.model_validate(geom_data))

            elif entity_type == "LWPOLYLINE":
                points = [[p[0], p[1]] for p in entity.get_points()]
                geom_data["data"] = {
                    "points": points,
                    "closed": entity.closed
                }
                entities.append(GeometryEntity.model_validate(geom_data))

            elif entity_type == "CIRCLE":
                geom_data["data"] = {
                    "center": [entity.dxf.center[0], entity.dxf.center[1]],
                    "radius": entity.dxf.radius
                }
                entities.append(GeometryEntity.model_validate(geom_data))

            elif entity_type == "ARC":
                geom_data["data"] = {
                    "center": [entity.dxf.center[0], entity.dxf.center[1]],
                    "radius": entity.dxf.radius,
                    "start_angle": entity.dxf.start_angle,
                    "end_angle": entity.dxf.end_angle
                }
                entities.append(GeometryEntity.model_validate(geom_data))

            elif entity_type == "TEXT":
                geom_data["data"] = {
                    "position": [entity.dxf.insert[0], entity.dxf.insert[1]],
                    "text": entity.dxf.text,
                    "height": entity.dxf.height,
                    "rotation": entity.dxf.rotation if hasattr(entity.dxf, 'rotation') else 0
                }
                entities.append(GeometryEntity.model_validate(geom_data))

            elif entity_type == "MTEXT":
                geom_data["data"] = {
                    "position": [entity.dxf.insert[0], entity.dxf.insert[1]],
                    "text": entity.text,
                    "height": entity.dxf.char_height,
                    "rotation": entity.dxf.rotation if hasattr(entity.dxf, 'rotation') else 0
                }
                entities.append(GeometryEntity.model_validate(geom_data))

        except Exception as e:
            print(f"Error processing entity {entity_type}: {e}")
            continue

    return bounding_box, entities


@app.get("/api/files/{file_id}/layers", response_model=LayerResponse)
async def get_layers(file_id: str):
    """Get layer information for a file"""
    if file_id not in file_storage:
        raise HTTPException(status_code=404, detail="File not found")

    file_info = file_storage[file_id]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_info.file_type.lower()}")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File data not found on disk")

    try:
        doc = parse_dxf_file(file_path)
        if not doc:
            raise HTTPException(status_code=400, detail="Failed to parse file")

        layers = extract_layers(doc)

        return LayerResponse(
            file_id=file_id,
            filename=file_info.filename,
            layers=layers
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/files/{file_id}/measurements", response_model=MeasurementResponse)
async def get_measurements(file_id: str):
    """Get measurements for a file"""
    if file_id not in file_storage:
        raise HTTPException(status_code=404, detail="File not found")

    file_info = file_storage[file_id]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_info.file_type.lower()}")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File data not found on disk")

    try:
        doc = parse_dxf_file(file_path)
        if not doc:
            raise HTTPException(status_code=400, detail="Failed to parse file")

        measurements = extract_measurements(doc)

        return MeasurementResponse(
            file_id=file_id,
            filename=file_info.filename,
            measurements=measurements
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/files/{file_id}/preview", response_model=PreviewResponse)
async def get_preview(file_id: str):
    """Get preview geometry data for a file"""
    if file_id not in file_storage:
        raise HTTPException(status_code=404, detail="File not found")

    file_info = file_storage[file_id]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_info.file_type.lower()}")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File data not found on disk")

    try:
        doc = parse_dxf_file(file_path)
        if not doc:
            raise HTTPException(status_code=400, detail="Failed to parse file")

        bbox, entities = extract_preview_geometry(doc)

        return PreviewResponse(
            file_id=file_id,
            filename=file_info.filename,
            bounding_box=bbox,
            entities=entities
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/files")
async def list_files():
    """List all uploaded files"""
    return {"files": list(file_storage.values())}


@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its metadata"""
    if file_id not in file_storage:
        raise HTTPException(status_code=404, detail="File not found")

    file_info = file_storage[file_id]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_info.file_type.lower()}")

    if os.path.exists(file_path):
        os.remove(file_path)

    del file_storage[file_id]

    return {"success": True, "message": "File deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
