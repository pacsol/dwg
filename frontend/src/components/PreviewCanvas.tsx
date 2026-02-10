import React, { useEffect, useRef, useState } from 'react';
import { PreviewData, GeometryEntity, BoundingBox } from '../types';

interface PreviewCanvasProps {
  previewData: PreviewData | null;
  isLoading: boolean;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ previewData, isLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDING = 50;

  const getColor = (colorIndex: number): string => {
    const colorMap: { [key: number]: string } = {
      1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
      5: '#0000FF', 6: '#FF00FF', 7: '#000000', 8: '#404040',
      9: '#808080', 10: '#FF8080', 11: '#FFFF80', 12: '#80FF80',
      13: '#80FFFF', 14: '#8080FF', 15: '#FF80FF',
    };
    return colorMap[colorIndex] || '#666666';
  };

  const calculateTransform = (bbox: BoundingBox): { scale: number; offsetX: number; offsetY: number } => {
    const contentWidth = bbox.width || 100;
    const contentHeight = bbox.height || 100;

    const scaleX = (CANVAS_WIDTH - 2 * PADDING) / contentWidth;
    const scaleY = (CANVAS_HEIGHT - 2 * PADDING) / contentHeight;
    const newScale = Math.min(scaleX, scaleY) * 0.9;

    const contentCenterX = (bbox.min_x + bbox.max_x) / 2;
    const contentCenterY = (bbox.min_y + bbox.max_y) / 2;

    const offsetX = CANVAS_WIDTH / 2 - contentCenterX * newScale;
    const offsetY = CANVAS_HEIGHT / 2 + contentCenterY * newScale; // Flip Y

    return { scale: newScale, offsetX, offsetY };
  };

  const worldToScreen = (x: number, y: number, transform: { scale: number; offsetX: number; offsetY: number }) => {
    return {
      x: x * transform.scale + transform.offsetX + offset.x,
      y: -y * transform.scale + transform.offsetY + offset.y // Flip Y for canvas
    };
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, entity: GeometryEntity, transform: { scale: number; offsetX: number; offsetY: number }) => {
    ctx.strokeStyle = getColor(entity.color);
    ctx.fillStyle = getColor(entity.color);
    ctx.lineWidth = Math.max(1, 1.5 / scale);

    switch (entity.type) {
      case 'LINE':
        if (entity.data.start && entity.data.end) {
          const start = worldToScreen(entity.data.start[0], entity.data.start[1], transform);
          const end = worldToScreen(entity.data.end[0], entity.data.end[1], transform);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
        break;

      case 'LWPOLYLINE':
        if (entity.data.points && entity.data.points.length > 1) {
          ctx.beginPath();
          const first = worldToScreen(entity.data.points[0][0], entity.data.points[0][1], transform);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < entity.data.points.length; i++) {
            const pt = worldToScreen(entity.data.points[i][0], entity.data.points[i][1], transform);
            ctx.lineTo(pt.x, pt.y);
          }
          if (entity.data.closed) {
            ctx.closePath();
            ctx.fillStyle = getColor(entity.color) + '40'; // Add transparency
            ctx.fill();
          }
          ctx.stroke();
        }
        break;

      case 'CIRCLE':
        if (entity.data.center && entity.data.radius) {
          const center = worldToScreen(entity.data.center[0], entity.data.center[1], transform);
          const radius = entity.data.radius * transform.scale;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'ARC':
        if (entity.data.center && entity.data.radius !== undefined && 
            entity.data.start_angle !== undefined && entity.data.end_angle !== undefined) {
          const center = worldToScreen(entity.data.center[0], entity.data.center[1], transform);
          const radius = entity.data.radius * transform.scale;
          const startAngle = -entity.data.end_angle * Math.PI / 180; // Flip angles
          const endAngle = -entity.data.start_angle * Math.PI / 180;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, startAngle, endAngle);
          ctx.stroke();
        }
        break;

      case 'TEXT':
      case 'MTEXT':
        if (entity.data.position && entity.data.text) {
          const pos = worldToScreen(entity.data.position[0], entity.data.position[1], transform);
          const fontSize = (entity.data.height || 2.5) * transform.scale;
          ctx.font = `${fontSize}px Arial`;
          ctx.fillStyle = getColor(entity.color);
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(-(entity.data.rotation || 0) * Math.PI / 180);
          ctx.fillText(entity.data.text, 0, 0);
          ctx.restore();
        }
        break;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Calculate transform
    const transform = calculateTransform(previewData.bounding_box);

    // Draw entities
    previewData.entities.forEach(entity => {
      drawEntity(ctx, entity, transform);
    });

    // Draw axes
    const origin = worldToScreen(0, 0, transform);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x - 20, origin.y);
    ctx.lineTo(origin.x + 20, origin.y);
    ctx.moveTo(origin.x, origin.y - 20);
    ctx.lineTo(origin.x, origin.y + 20);
    ctx.stroke();

  }, [previewData, scale, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  if (isLoading) {
    return (
      <div className="preview-canvas">
        <h3>2D Preview</h3>
        <div className="loading">Loading preview...</div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="preview-canvas">
        <h3>2D Preview</h3>
        <div className="no-data">Upload a file to see preview</div>
      </div>
    );
  }

  return (
    <div className="preview-canvas">
      <div className="preview-header">
        <h3>2D Preview</h3>
        <button onClick={handleReset} className="reset-btn">Reset View</button>
      </div>
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </div>
      <div className="preview-info">
        <span>Entities: {previewData.entities.length}</span>
        <span>Size: {previewData.bounding_box.width.toFixed(1)} x {previewData.bounding_box.height.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default PreviewCanvas;
