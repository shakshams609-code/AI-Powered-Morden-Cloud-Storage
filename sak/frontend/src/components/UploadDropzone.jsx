import { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { api } from '../services/api';

export function UploadDropzone({ onUpload, visibility, onVisibilityChange }) {
  const [status, setStatus] = useState('Drag files here or click to upload');

  const handleFile = useCallback(async (files) => {
    if (!files.length) return;
    const form = new FormData();
    form.append('file', files[0]);
    form.append('folder', '/');
    form.append('visibility', visibility);

    try {
      setStatus('Uploading…');
      await api.uploadFile(form);
      setStatus(`Upload complete (${files[0].name})`);
      onUpload();
    } catch (err) {
      console.error(err);
      setStatus('Upload failed');
    }
  }, [onUpload, visibility]);

  const handleChange = (event) => handleFile(event.target.files);

  return (
    <div className="upload-shell">
      <div className="visibility-controls">
        <label htmlFor="visibility">Storage mode</label>
        <select id="visibility" value={visibility} onChange={(event) => onVisibilityChange(event.target.value)}>
          <option value="private">Private cloud</option>
          <option value="public">Public cloud</option>
        </select>
      </div>
      <label className="dropzone">
        <UploadCloud size={42} />
        <p>{status}</p>
        <input type="file" hidden onChange={handleChange} />
      </label>
    </div>
  );
}
