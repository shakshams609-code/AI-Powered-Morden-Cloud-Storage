import { useEffect, useMemo, useState } from 'react';
import { FileExplorer } from './components/FileExplorer';
import { UploadDropzone } from './components/UploadDropzone';
import { Chatbot } from './components/Chatbot';
import { api } from './services/api';

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

const defaultUser = { id: '', name: '', email: '', token: '' };

function readStoredUser() {
  try {
    const stored = localStorage.getItem('cloud-user');
    return stored ? JSON.parse(stored) : defaultUser;
  } catch {
    return defaultUser;
  }
}

export default function App() {
  const [user, setUser] = useState(readStoredUser);
  const [files, setFiles] = useState([]);
  const [publicFiles, setPublicFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState('/');
  const [visibility, setVisibility] = useState('private');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [activity, setActivity] = useState('Ready to upload your first file.');
  const [newFolderName, setNewFolderName] = useState('');
  const [activeView, setActiveView] = useState('files');

  useEffect(() => {
    if (!user.token) {
      api.setToken('');
      setFiles([]);
      fetchPublicFiles();
      return;
    }

    api.setToken(user.token);
    fetchFiles();
    fetchPublicFiles();
  }, [user.token, query, folder]);

  const fetchFiles = async () => {
    try {
      const data = await api.getFiles({ q: query, folder });
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPublicFiles = async () => {
    try {
      const data = await api.getPublicFiles();
      setPublicFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    await fetchFiles();
    await fetchPublicFiles();
    setActivity('Upload complete. Your file is now available in storage.');
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const payload = authMode === 'login'
        ? await api.login({ email: authForm.email, password: authForm.password })
        : await api.register({ name: authForm.name, email: authForm.email, password: authForm.password });

      const nextUser = { ...payload.user, token: payload.token };
      setUser(nextUser);
      localStorage.setItem('cloud-user', JSON.stringify(nextUser));
      api.setToken(payload.token);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(defaultUser);
    localStorage.removeItem('cloud-user');
    api.setToken('');
  };

  const heroSubtitle = useMemo(() => {
    if (user.token) {
      return `Welcome back, ${user.name || user.email}. Your private and public files stay organized in one secure workspace.`;
    }
    return 'Create an account to upload files into private or public cloud storage, then browse the public gallery instantly.';
  }, [user.email, user.name, user.token]);

  const handleCreateFolder = async (event) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(newFolderName.trim(), folder);
      setNewFolderName('');
      setActivity(`Folder created: ${newFolderName.trim()}`);
      await fetchFiles();
    } catch (err) {
      setActivity('Could not create folder.');
      console.error(err);
    }
  };

  const storageSummary = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const publicCount = files.filter((file) => file.visibility === 'public').length;
    return {
      count: files.length,
      totalSize: formatBytes(totalSize),
      publicCount
    };
  }, [files]);

  // Show chatbot if chat view is active
  if (activeView === 'chat' && user.token) {
    return <Chatbot user={user} />;
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <strong>Cloud File Storage</strong>
          <p>Secure uploads for private folders and public sharing in one polished workspace.</p>
        </div>
        {user.token ? (
          <div className="topbar-actions">
            <div className="view-switcher">
              <button 
                className={`view-btn ${activeView === 'files' ? 'active' : ''}`}
                onClick={() => setActiveView('files')}
              >
                Files
              </button>
              <button 
                className={`view-btn ${activeView === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveView('chat')}
              >
                AI Chat
              </button>
            </div>
            <span className="user-pill">{user.name || user.email}</span>
            <button className="sign-in-button" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <button className="sign-in-button" onClick={() => setAuthMode('login')}>Login</button>
        )}
      </header>

      <section className="hero-panel">
        <div>
          <h1>Modern Cloud File Storage</h1>
          <p>{heroSubtitle}</p>
        </div>
        <div className="hero-stats">
          <div><strong>24/7</strong><span>Cloud sync</span></div>
          <div><strong>Public</strong><span>or private uploads</span></div>
          <div><strong>Secure</strong><span>JWT-authenticated access</span></div>
        </div>
      </section>

      {user.token ? (
        <section className="info-strip card">
          <div><strong>{storageSummary.count}</strong><span>Files stored</span></div>
          <div><strong>{storageSummary.totalSize}</strong><span>Used space</span></div>
          <div><strong>{storageSummary.publicCount}</strong><span>Public files</span></div>
          <div className="activity-box">{activity}</div>
        </section>
      ) : null}

      {!user.token ? (
        <section className="auth-panel card">
          <div className="panel-header">
            <h2>{authMode === 'login' ? 'Login to your account' : 'Create a new account'}</h2>
            <button className="secondary-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Register instead' : 'Login instead'}
            </button>
          </div>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Your name"
                value={authForm.name}
                onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              required
            />
            {authError && <p className="error-text">{authError}</p>}
            <button className="sign-in-button" type="submit" disabled={authLoading}>
              {authLoading ? 'Please wait…' : authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="workspace-grid">
        <div className="panel card">
          <div className="panel-header">
            <h2>{user.token ? 'Upload & Share' : 'Public storage preview'}</h2>
            {user.token ? (
              <input
                type="text"
                placeholder="Search files"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            ) : null}
          </div>
          {user.token ? (
            <>
              <UploadDropzone onUpload={handleUpload} visibility={visibility} onVisibilityChange={setVisibility} />
              <form className="folder-form" onSubmit={handleCreateFolder}>
                <input
                  type="text"
                  placeholder="Create a folder"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                />
                <button className="secondary-button" type="submit">Create</button>
              </form>
            </>
          ) : (
            <div className="empty-state">Sign in to upload your own files. Public files already stored in the cloud are visible below.</div>
          )}
        </div>

        <div className="panel card">
          <div className="panel-header">
            <h2>{user.token ? 'Your files' : 'Public files'}</h2>
            {user.token ? (
              <select value={folder} onChange={(event) => setFolder(event.target.value)}>
                <option value="/">Root</option>
                <option value="/projects">Projects</option>
                <option value="/assets">Assets</option>
              </select>
            ) : null}
          </div>
          <FileExplorer
            files={user.token ? files : publicFiles}
            emptyState={user.token ? 'No files yet. Drop a file to start using storage.' : 'No public files have been shared yet.'}
            onRefresh={handleUpload}
            isAuthenticated={Boolean(user.token)}
          />
        </div>
      </section>
    </div>
  );
}
