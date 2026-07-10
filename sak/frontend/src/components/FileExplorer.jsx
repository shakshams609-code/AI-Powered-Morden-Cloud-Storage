import { useState } from 'react';
import { Download, ExternalLink, FileText, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../services/api';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function FileExplorer({ files, emptyState, onRefresh, isAuthenticated = false }) {
  const [assistantState, setAssistantState] = useState({});
  const [loadingInsightId, setLoadingInsightId] = useState('');

  const handleRename = async (file) => {
    const nextName = window.prompt('Rename file', file.name);
    if (!nextName || !nextName.trim()) return;
    try {
      await api.renameFile(file._id, nextName.trim());
      onRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete ${file.name}?`)) return;
    try {
      await api.deleteFile(file._id);
      onRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleInsight = async (file) => {
    const current = assistantState[file._id] || {};
    if (current.insight) {
      setAssistantState((prev) => ({ ...prev, [file._id]: { ...prev[file._id], isOpen: true } }));
      return;
    }

    setLoadingInsightId(file._id);
    try {
      const result = await api.getAssistantInsight(file._id);
      setAssistantState((prev) => ({
        ...prev,
        [file._id]: {
          ...(prev[file._id] || {}),
          insight: result,
          isOpen: true,
          messages: []
        }
      }));
    } catch (error) {
      console.error(error);
      setAssistantState((prev) => ({
        ...prev,
        [file._id]: {
          ...(prev[file._id] || {}),
          insight: { summary: 'Assistant is unavailable right now.', tags: ['smart-upload'], action: 'Please try again shortly.' },
          isOpen: true,
          messages: []
        }
      }));
    } finally {
      setLoadingInsightId('');
    }
  };

  const handleAsk = async (file, question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setAssistantState((prev) => ({
      ...prev,
      [file._id]: {
        ...(prev[file._id] || {}),
        isOpen: true,
        loading: true,
        messages: [...((prev[file._id] || {}).messages || []), { role: 'user', content: trimmed }]
      }
    }));

    try {
      const result = await api.askAssistant(file._id, trimmed);
      setAssistantState((prev) => ({
        ...prev,
        [file._id]: {
          ...(prev[file._id] || {}),
          loading: false,
          messages: [...((prev[file._id] || {}).messages || []), { role: 'assistant', content: result.answer }]
        }
      }));
    } catch (error) {
      console.error(error);
      setAssistantState((prev) => ({
        ...prev,
        [file._id]: {
          ...(prev[file._id] || {}),
          loading: false,
          messages: [...((prev[file._id] || {}).messages || []), { role: 'assistant', content: 'I could not answer that right now. Please try again.' }]
        }
      }));
    }
  };

  if (!files?.length) {
    return <div className="empty-state">{emptyState || 'No files yet. Drop a file to start using storage.'}</div>;
  }

  return (
    <div className="file-grid">
      {files.map((file) => (
        <article key={file._id} className="file-card">
          <div className="file-icon"><FileText /></div>
          <div className="file-meta">
            <strong>{file.name}</strong>
            <span>{Math.round(file.size / 1024)} KB • {file.folder}</span>
          </div>
          <div className="file-actions">
            <span className={`visibility-pill ${file.visibility || 'private'}`}>
              {file.visibility === 'public' ? 'Public' : 'Private'}
            </span>
            {isAuthenticated ? (
              <button className="tiny-button" onClick={() => handleInsight(file)}>
                <Sparkles size={16} /> {loadingInsightId === file._id ? 'Thinking…' : 'Ask AI'}
              </button>
            ) : null}
            {file.previewUrl ? (
              <a className="icon-link" href={file.previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Open
              </a>
            ) : null}
            <button className="tiny-button" onClick={() => window.open(file.previewUrl, '_blank')}>
              <Download size={16} /> Download
            </button>
            <button className="tiny-button" onClick={() => handleRename(file)}>
              <Pencil size={16} /> Rename
            </button>
            <button className="tiny-button danger" onClick={() => handleDelete(file)}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
          {assistantState[file._id]?.isOpen ? (
            <div className="assistant-panel">
              <div className="assistant-title">
                <Sparkles size={16} /> AI assistant
              </div>
              {assistantState[file._id].insight ? (
                <>
                  <p>{assistantState[file._id].insight.summary}</p>
                  <div className="assistant-tags">
                    {(assistantState[file._id].insight.tags || []).map((tag) => (
                      <span key={tag} className="assistant-tag">{tag}</span>
                    ))}
                  </div>
                  <small>{assistantState[file._id].insight.action}</small>
                </>
              ) : null}
              <div className="assistant-chat">
                {(assistantState[file._id].messages || []).map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="assistant-input-row">
                <input
                  type="text"
                  placeholder="Ask about this file"
                  value={assistantState[file._id].draft || ''}
                  onChange={(event) => setAssistantState((prev) => ({
                    ...prev,
                    [file._id]: {
                      ...(prev[file._id] || {}),
                      draft: event.target.value
                    }
                  }))}
                />
                <button className="tiny-button" onClick={() => {
                  const currentDraft = assistantState[file._id]?.draft || '';
                  handleAsk(file, currentDraft);
                  setAssistantState((prev) => ({
                    ...prev,
                    [file._id]: {
                      ...(prev[file._id] || {}),
                      draft: ''
                    }
                  }));
                }} disabled={assistantState[file._id]?.loading}>
                  {assistantState[file._id]?.loading ? 'Thinking…' : 'Send'}
                </button>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
