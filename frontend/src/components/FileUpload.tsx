import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { UploadResponse } from '../types';

interface FileUploadProps {
  onUploadSuccess: (fileId: string, filename: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'dxf' && ext !== 'dwg') {
      setError('Only .dxf and .dwg files are supported');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<UploadResponse>(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        onUploadSuccess(response.data.file_id, response.data.filename);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Upload failed';
      const errorStatus = err.response?.status || '';
      setError(`Upload failed (${errorStatus}): ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload DWG/DXF File</h2>
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".dxf,.dwg"
          onChange={handleFileSelect}
          id="file-input"
          disabled={isUploading}
        />
        <label htmlFor="file-input" className="file-label">
          {isUploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <div className="upload-icon">📁</div>
              <p>Drag & drop a DWG or DXF file here</p>
              <p className="sub-text">or click to browse</p>
            </>
          )}
        </label>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default FileUpload;
