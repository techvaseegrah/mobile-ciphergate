// Utility functions for batch management
// This will allow sharing batch data between components

import api from '../services/api';

// Function to get all batches
export const getBatches = async () => {
  try {
    const response = await api.get('/batches');
    return response.data;
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
};

// Function to save batches to the database
export const saveBatches = async (batches) => {
  // This function is no longer needed as we're using API calls directly
  // Keeping it for backward compatibility
  return batches;
};

// Function to create a new batch
export const createBatch = async (batchData) => {
  try {
    const response = await api.post('/batches', batchData);
    return response.data;
  } catch (error) {
    console.error('Error creating batch:', error);
    throw error;
  }
};

// Function to update a batch
export const updateBatch = async (id, batchData) => {
  try {
    const response = await api.put(`/batches/${id}`, batchData);
    return response.data;
  } catch (error) {
    console.error('Error updating batch:', error);
    throw error;
  }
};

// Function to delete a batch
export const deleteBatch = async (id) => {
  try {
    const response = await api.delete(`/batches/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting batch:', error);
    throw error;
  }
};

// Function to get a batch by ID
export const getBatchById = async (id) => {
  try {
    const response = await api.get(`/batches/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching batch by ID:', error);
    return null;
  }
};