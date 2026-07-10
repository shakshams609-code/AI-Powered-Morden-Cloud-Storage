const API_BASE = 'http://localhost:4000/api';

const state = {
  token: localStorage.getItem('token') || '',
  files: [],
  query: '',
  folder: '/'
};

const api = {
  headers() {
    return state.token ? { Authorization: `Bearer ${state.token}` } : {};
  },
  async request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}), ...this.headers() }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }
    return response.json();
  },
  async login() {
    const credentials = { email: 'demo@cloudvault.com', password: 'demo123' };
    try {
      return await this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    } catch (error) {
      return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Demo User', ...credentials }) });
    }
  },
  async getFiles() {
    const query = new URLSearchParams({ q: state.query, folder: state.folder });
    const response = await fetch(`${API_BASE}/files?${query.toString()}`, { headers: this.headers() });
    if (!response.ok) throw new Error('Unable to load files');
    return response.json();
  },
  async uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', state.folder);
    const response = await fetch(`${API_BASE}/files/upload`, { method: 'POST', body: form, headers: this.headers() });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }
};

function setStatus(message) {
  const statusEl = document.getElementById('status-text');
  if (statusEl) statusEl.textContent = message;
}

function renderFiles() {
  const list = document.getElementById('file-list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.files.length) {
    list.innerHTML = '<div class="empty-state">No files yet. Upload a file or login to sync.</div>';
    return;
  }

  state.files.forEach((file) => {
    const card = document.createElement('article');
    card.className = 'file-card';
    card.innerHTML = `
      <div class="file-icon"><span>📄</span></div>
      <div class="file-meta">
        <strong>${file.name}</strong>
        <span>${Math.round(file.size / 1024)} KB • ${file.folder}</span>
      </div>
      <div class="file-actions">
        <button type="button" data-id="${file._id}" data-action="download">Download</button>
        <button type="button" data-id="${file._id}" data-action="share">Share</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function refreshFiles() {
  setStatus('Loading files...');
  try {
    state.files = await api.getFiles();
    renderFiles();
    setStatus('Files synchronized.');
  } catch (error) {
    setStatus(error.message);
  }
}

async function handleLogin() {
  try {
    setStatus('Logging in...');
    const data = await api.login();
    state.token = data.token;
    localStorage.setItem('token', data.token);
    setStatus('Logged in as demo user');
    updateControls();
    await refreshFiles();
  } catch (error) {
    setStatus(error.message);
  }
}

function updateControls() {
  const loginButton = document.getElementById('login-button');
  const authStatus = document.getElementById('auth-status');
  if (state.token) {
    authStatus.textContent = 'Demo user authenticated';
    loginButton.textContent = 'Refresh files';
  } else {
    authStatus.textContent = 'Login as demo user to use storage features';
    loginButton.textContent = 'Demo Login';
  }
}

function bindEvents() {
  const loginButton = document.getElementById('login-button');
  const searchInput = document.getElementById('search-input');
  const folderSelect = document.getElementById('folder-select');
  const uploadInput = document.getElementById('upload-input');
  const fileList = document.getElementById('file-list');

  loginButton?.addEventListener('click', handleLogin);
  searchInput?.addEventListener('input', async (e) => {
    state.query = e.target.value;
    await refreshFiles();
  });
  folderSelect?.addEventListener('change', async (e) => {
    state.folder = e.target.value;
    await refreshFiles();
  });
  uploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('Uploading…');
    try {
      await api.uploadFile(file);
      setStatus('Upload complete');
      await refreshFiles();
    } catch (error) {
      setStatus(error.message);
    }
  });

  fileList?.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'download') {
      try {
        const response = await api.request(`/files/${id}/download`, { method: 'GET' });
        window.open(response.url, '_blank');
      } catch (error) {
        setStatus(error.message);
      }
    }
    if (action === 'share') {
      try {
        const response = await api.request(`/files/${id}/share`, { method: 'PATCH' });
        setStatus(`Share token created: ${response.shareToken}`);
      } catch (error) {
        setStatus(error.message);
      }
    }
  });
}

function renderApp() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <header class="topbar">
      <div>
        <strong>Cloud File Storage</strong>
        <p>Open this file directly in the browser and use the demo login to connect to the backend.</p>
      </div>
      <div>
        <div id="auth-status" class="auth-status"></div>
        <button id="login-button" class="sign-in-button">Demo Login</button>
      </div>
    </header>
    <section class="hero-panel">
      <div>
        <h1>Modern Cloud File Storage</h1>
        <p>Upload files, browse folders, preview documents, and generate share links in one polished workspace.</p>
      </div>
      <div class="hero-stats">
        <div><strong>24/7</strong><span>Cloud sync</span></div>
        <div><strong>100+</strong><span>Advanced features</span></div>
        <div><strong>Secure</strong><span>Encrypted storage</span></div>
      </div>
    </section>
    <section class="workspace-grid">
      <div class="panel card">
        <div class="panel-header">
          <h2>Upload & Share</h2>
          <input id="search-input" type="text" placeholder="Search files" value="" />
        </div>
        <label class="dropzone">
          <strong>Upload file</strong>
          <p>Click to choose a file or use the file picker.</p>
          <input id="upload-input" type="file" hidden />
        </label>
      </div>
      <div class="panel card">
        <div class="panel-header">
          <h2>File Explorer</h2>
          <select id="folder-select">
            <option value="/">Root</option>
            <option value="/projects">Projects</option>
            <option value="/assets">Assets</option>
          </select>
        </div>
        <div id="file-list" class="file-grid"></div>
      </div>
    </section>
    <footer class="card" style="margin-top:20px;">
      <div id="status-text">Ready. Use demo login to connect.</div>
    </footer>
  `;
  bindEvents();
  updateControls();
}

renderApp();
