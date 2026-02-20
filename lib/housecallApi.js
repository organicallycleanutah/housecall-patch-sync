/**
 * Housecall Pro API Client
 * Base URL: https://api.housecallpro..com
 */

import axios from 'axios';

const HOUSECALL_API_BASE = 'https://api.housecallpro.com';

// Get API key from environment variables
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env.HOUSECALL_API_KEY) {
    return process.env.HOUSECALL_API_KEY;
  }
  throw new Error('HOUSECALL_API_KEY environment variable is not set');
};

/**
 * Create axios instance with auth headers
 */
const createApiClient = () => {
  return axios.create({
    baseURL: HOUSECALL_API_BASE,
    headers: {
      'Authorization': `Token ${getApiKey()}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
  });
};

/**
 * Get all customers (paginated)
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Results per page (default: 50)
 * @returns {Promise<object>} - Customer data with pagination info
 */
export async function getCustomers(page = 1, pageSize = 50) {
  try {
    const api = createApiClient();

    const response = await api.get('/customers', {
      params: { page, page_size: pageSize }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching customers from Housecall Pro:', error.message);
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }
}

/**
 * Get all customers (fetches all pages)
 * @returns {Promise<array>} - Array of all customers
 */
export async function getAllCustomers() {
  try {
    const customers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getCustomers(page, 100); // Max per page
      customers.push(...result.customers);

      // Check if there are more pages
      hasMore = page < result.total_pages;
      page++;

      // Safety limit
      if (page > 100) {
        console.warn('Hit safety limit of 100 pages.');
        break;
      }
    }

    console.log(`Fetched ${customers.length} total customers from Housecall Pro`);
    return customers;
  } catch (error) {
    console.error('Error fetching all customers:', error.message);
    throw error;
  }
}

/**
 * Get a single customer by ID
 * @param {string} customerId - Housecall Pro customer ID
 * @returns {Promise<object>} - Customer object
 */
export async function getCustomerById(customerId) {
  try {
    const api = createApiClient();

    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error.message);
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
}

/**
 * Get jobs for a specific customer
 * @param {string} customerId - Housecall Pro customer ID
 * @returns {Promise<array>} - Array of jobs for this customer
 */
export async function getCustomerJobs(customerId) {
  try {
    const api = createApiClient();

    const response = await api.get('/jobs', {
      params: { customer_id: customerId }
    });

    return response.data.jobs || [];
  } catch (error) {
    console.error(`Error fetching jobs for customer ${customerId}:`, error.message);
    return []; // Return empty array if jobs fetch fails
  }
}

/**
 * Get the most recent completed job date for a customer
 * @param {string} customerId - Housecall Pro customer ID
 * @returns {Promise<string|null>} - ISO date string of last completed job, or null
 */
export async function getLastServiceDate(customerId) {
  try {
    const jobs = await getCustomerJobs(customerId);

    // Filter for completed jobs
    const completedJobs = jobs.filter(job =>
      job.status === 'completed' && job.completed_at
    );

    if (completedJobs.length === 0) {
      return null;
    }

    // Sort by completed_at date (most recent first)
    completedJobs.sort((a, b) =>
      new Date(b.completed_at) - new Date(a.completed_at)
    );

    return completedJobs[0].completed_at;
  } catch (error) {
    console.error(`Error getting last service date for customer ${customerId}:`, error.message);
    return null;
  }
}
