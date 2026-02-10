import React from 'react';
import { Measurements } from '../types';

interface MeasurementsPanelProps {
  measurements: Measurements | null;
  isLoading: boolean;
}

const MeasurementsPanel: React.FC<MeasurementsPanelProps> = ({ measurements, isLoading }) => {
  if (isLoading) {
    return (
      <div className="measurements-panel">
        <h3>Measurements</h3>
        <div className="loading">Loading measurements...</div>
      </div>
    );
  }

  if (!measurements) {
    return (
      <div className="measurements-panel">
        <h3>Measurements</h3>
        <div className="no-data">Upload a file to see measurements</div>
      </div>
    );
  }

  const bbox = measurements.bounding_box;

  return (
    <div className="measurements-panel">
      <h3>Measurements</h3>

      <div className="measurement-section">
        <h4>Summary</h4>
        <div className="measurement-grid">
          <div className="measurement-item">
            <span className="label">Total Entities:</span>
            <span className="value">{measurements.total_entities.toLocaleString()}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Total Line Length:</span>
            <span className="value">{measurements.total_line_length.toFixed(2)}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Total Closed Area:</span>
            <span className="value">{measurements.total_closed_area.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="measurement-section">
        <h4>Bounding Box</h4>
        <div className="measurement-grid">
          <div className="measurement-item">
            <span className="label">Min X / Y / Z:</span>
            <span className="value">{bbox.min_x.toFixed(2)} / {bbox.min_y.toFixed(2)} / {bbox.min_z.toFixed(2)}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Max X / Y / Z:</span>
            <span className="value">{bbox.max_x.toFixed(2)} / {bbox.max_y.toFixed(2)} / {bbox.max_z.toFixed(2)}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Width:</span>
            <span className="value">{bbox.width.toFixed(2)}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Height:</span>
            <span className="value">{bbox.height.toFixed(2)}</span>
          </div>
          <div className="measurement-item">
            <span className="label">Depth:</span>
            <span className="value">{bbox.depth.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {measurements.dimensions.length > 0 && (
        <div className="measurement-section">
          <h4>Dimensions ({measurements.dimensions.length})</h4>
          <div className="dimensions-list">
            {measurements.dimensions.slice(0, 10).map((dim, index) => (
              <div key={index} className="dimension-item">
                <span className="dim-text">{dim.text}</span>
                <span className="dim-value">{dim.actual_measurement.toFixed(2)}</span>
                <span className="dim-layer">{dim.layer}</span>
              </div>
            ))}
            {measurements.dimensions.length > 10 && (
              <div className="more-dims">...and {measurements.dimensions.length - 10} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeasurementsPanel;
