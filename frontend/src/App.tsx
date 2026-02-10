import React, { useState, useCallback } from 'react';
import axios from 'axios';
import FileUpload from './components/FileUpload';
import LayerPanel from './components/LayerPanel';
import MeasurementsPanel from './components/MeasurementsPanel';
import PreviewCanvas from './components/PreviewCanvas';
import { LayerResponse, MeasurementResponse, PreviewData } from './types';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [layers, setLayers] = useState<LayerResponse | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementResponse | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState({
    layers: false,
    measurements: false,
    preview: false
  });

  const fetchFileData = useCallback(async (id: string) => {
    setLoading({ layers: true, measurements: true, preview: true });

    try {
      const [layersRes, measurementsRes, previewRes] = await Promise.all([
        axios.get<LayerResponse>(`http://localhost:8000/api/files/${id}/layers`),
        axios.get<MeasurementResponse>(`http://localhost:8000/api/files/${id}/measurements`),
        axios.get<PreviewData>(`http://localhost:8000/api/files/${id}/preview`)
      ]);

      setLayers(layersRes.data);
      setMeasurements(measurementsRes.data);
      setPreview(previewRes.data);
    } catch (error) {
      console.error('Error fetching file data:', error);
      alert('Failed to load file data. Please try again.');
    } finally {
      setLoading({ layers: false, measurements: false, preview: false });
    }
  }, []);

  const handleUploadSuccess = useCallback((id: string, name: string) => {
    setFileId(id);
    setFilename(name);
    fetchFileData(id);
  }, [fetchFileData]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📐 DWG Dashboard</h1>
        <p>DWG/DXF File Analysis & Visualization</p>
      </header>

      <main className="app-main">
        <div className="upload-section">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          {fileId && (
            <div className="file-info">
              <strong>Current File:</strong> {filename}
              <span className="file-id">ID: {fileId.slice(0, 8)}...</span>
            </div>
          )}
        </div>

        {fileId && (
          <div className="dashboard-grid">
            <div className="panel layers-panel">
              <LayerPanel 
                layers={layers?.layers || []} 
                isLoading={loading.layers} 
              />
            </div>

            <div className="panel measurements-panel-container">
              <MeasurementsPanel 
                measurements={measurements?.measurements || null}
                isLoading={loading.measurements}
              />
            </div>

            <div className="panel preview-panel">
              <PreviewCanvas 
                previewData={preview}
                isLoading={loading.preview}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>DWG Dashboard Prototype • Built with FastAPI & React</p>
      </footer>
    </div>
  );
}

export default App;
