import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const client = axios.create({
  baseURL: apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`,
  headers: { 'Content-Type': 'application/json' }
});

export const api = {
  // generic wrappers for raw API calls (used by Chatbot and other components)
  async get(path, config) {
    const res = await client.get(path, config);
    return res;
  },
  async post(path, data, config) {
    const res = await client.post(path, data, config);
    return res;
  },
  async put(path, data, config) {
    const res = await client.put(path, data, config);
    return res;
  },
  async delete(path, config) {
    const res = await client.delete(path, config);
    return res;
  },
  setToken(token) {
    client.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
  },
  async login(credentials) {
    const response = await client.post('/auth/login', credentials);
    return response.data;
  },
  async register(payload) {
    const response = await client.post('/auth/register', payload);
    return response.data;
  },
  async getFiles(params = {}) {
    const response = await client.get('/files', { params });
    return response.data;
  },
  async uploadFile(formData) {
    const response = await client.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  async getPublicFiles() {
    const response = await client.get('/files/public');
    return response.data;
  },
  async renameFile(id, name) {
    const response = await client.patch(`/files/${id}/rename`, { name });
    return response.data;
  },
  async deleteFile(id) {
    const response = await client.delete(`/files/${id}`);
    return response.data;
  },
  async getAssistantInsight(id) {
    const response = await client.get(`/files/${id}/assistant`);
    return response.data;
  },
  async askAssistant(id, question) {
    const response = await client.post(`/files/${id}/ask`, { question });
    return response.data;
  },
  async createFolder(name, folder) {
    const response = await client.post('/files/folder', { name, folder });
    return response.data;
  }
};
