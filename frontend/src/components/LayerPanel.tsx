import React from 'react';
import { LayerInfo } from '../types';

interface LayerPanelProps {
  layers: LayerInfo[];
  isLoading: boolean;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ layers, isLoading }) => {
  const getColorStyle = (colorIndex: number): React.CSSProperties => {
    const colorMap: { [key: number]: string } = {
      1: '#FF0000',    // Red
      2: '#FFFF00',    // Yellow
      3: '#00FF00',    // Green
      4: '#00FFFF',    // Cyan
      5: '#0000FF',    // Blue
      6: '#FF00FF',    // Magenta
      7: '#FFFFFF',    // White
      8: '#404040',    // Dark Gray
      9: '#808080',    // Light Gray
      10: '#FF8080',   // Light Red
      11: '#FFFF80',   // Light Yellow
      12: '#80FF80',   // Light Green
      13: '#80FFFF',   // Light Cyan
      14: '#8080FF',   // Light Blue
      15: '#FF80FF',   // Light Magenta
    };

    return {
      backgroundColor: colorMap[colorIndex] || '#CCCCCC',
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      border: '1px solid #666',
      display: 'inline-block',
      marginRight: '8px',
    };
  };

  if (isLoading) {
    return (
      <div className="layer-panel">
        <h3>Layers</h3>
        <div className="loading">Loading layers...</div>
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <div className="layer-panel">
        <h3>Layers</h3>
        <div className="no-data">Upload a file to see layers</div>
      </div>
    );
  }

  return (
    <div className="layer-panel">
      <h3>Layers ({layers.length})</h3>
      <div className="layer-list">
        <div className="layer-header">
          <span>Layer</span>
          <span>Entities</span>
          <span>Line Length</span>
          <span>Area</span>
        </div>
        {layers.map((layer) => (
          <div key={layer.name} className={`layer-item ${!layer.visible ? 'hidden' : ''}`}>
            <div className="layer-name">
              <span style={getColorStyle(layer.color)}></span>
              <span className="name-text" title={layer.name}>
                {layer.name}
              </span>
              {!layer.visible && <span className="hidden-badge">hidden</span>}
            </div>
            <div className="layer-stats">
              <span>{layer.entity_count}</span>
              <span>{layer.line_length.toFixed(2)}</span>
              <span>{layer.closed_area.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerPanel;
