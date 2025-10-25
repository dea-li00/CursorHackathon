import axios from 'axios';
import type { APBill, BillSummary } from './types';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFiles = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await api.post('/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const extractInvoices = async (fileIds: string[]): Promise<BillSummary[]> => {
  const response = await api.post('/extract', { file_ids: fileIds });
  return response.data;
};

export const getBills = async (status?: string, search?: string): Promise<BillSummary[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  
  const response = await api.get(`/bills?${params.toString()}`);
  return response.data;
};

export const getBill = async (billId: string): Promise<APBill> => {
  const response = await api.get(`/bills/${billId}`);
  return response.data;
};

export const updateBill = async (billId: string, updates: Partial<APBill>): Promise<APBill> => {
  const response = await api.patch(`/bills/${billId}`, updates);
  return response.data;
};

export const approveBill = async (billId: string): Promise<APBill> => {
  const response = await api.post(`/bills/${billId}/approve`);
  return response.data;
};

export const exportExcel = async (billIds?: string[]): Promise<{ filepath: string; filename: string }> => {
  const response = await api.post('/export/excel', { ids: billIds });
  return response.data;
};

export const downloadExport = async (filename: string): Promise<void> => {
  const response = await api.get(`/export/download/${filename}`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reextractBill = async (billId: string, engine?: string): Promise<APBill> => {
  const response = await api.post(`/reextract/${billId}`, { engine });
  return response.data;
};

export const healthCheck = async (): Promise<{ status: string; engines: Record<string, boolean> }> => {
  const response = await api.get('/health');
  return response.data;
};
