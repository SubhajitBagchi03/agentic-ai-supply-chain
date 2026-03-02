/**
 * API service — centralized HTTP client for backend communication.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail?.error || errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
}

// === Dataset Upload APIs ===

export async function uploadInventory(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/inventory/upload', { method: 'POST', body: formData });
}

export async function uploadSupplier(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/supplier/upload', { method: 'POST', body: formData });
}

export async function uploadShipment(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/shipment/upload', { method: 'POST', body: formData });
}

export async function uploadDemand(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/demand/upload', { method: 'POST', body: formData });
}

// === Document Upload API ===

export async function uploadDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.document_type) formData.append('document_type', metadata.document_type);
  if (metadata.supplier_name) formData.append('supplier_name', metadata.supplier_name);
  if (metadata.notes) formData.append('notes', metadata.notes);
  return request('/documents/upload', { method: 'POST', body: formData });
}

// === Query API ===

export async function sendQuery(query, contextFilter = null) {
  return request('/query', {
    method: 'POST',
    body: JSON.stringify({ query, context_filter: contextFilter }),
  });
}

// === Health API ===

export async function getHealth() {
  return request('/health');
}

export async function resetSystem() {
  return request('/health/reset', { method: 'POST' });
}

// === Alert APIs ===

export async function getAlerts(unreadOnly = false, limit = 50) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unread_only', 'true');
  if (limit !== 50) params.set('limit', limit.toString());
  return request(`/alerts?${params.toString()}`);
}

export async function getUnreadCount() {
  return request('/alerts/unread-count');
}

export async function markAlertRead(alertId) {
  return request(`/alerts/${alertId}/read`, { method: 'POST' });
}

export async function markAllAlertsRead() {
  return request('/alerts/read-all', { method: 'POST' });
}

// === Google Sheets APIs ===

export async function connectSheet(url, datasetType, gid = '0') {
  return request('/sheets/connect', {
    method: 'POST',
    body: JSON.stringify({ url, dataset_type: datasetType, gid }),
  });
}

export async function connectSheetsBatch(sheets) {
  return request('/sheets/connect-batch', {
    method: 'POST',
    body: JSON.stringify({ sheets }),
  });
}

export async function refreshSheets() {
  return request('/sheets/refresh', { method: 'POST' });
}

export async function getSheetStatus() {
  return request('/sheets/status');
}

