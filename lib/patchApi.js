/**
 * Patch Retention (CityGro) API Client
 * Base URL: https://api.citygro.com/v2
 */

import axios from 'axios';

const PATCH_API_BASE = 'https://api.citygro.com/v2';

// Get API credentials from environment variables
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env.PATCH_API_KEY) {
    return process.env.PATCH_API_KEY;
  }
  throw new Error('PATCH_API_KEY environment variable is not set');
};

const getAccountId = () => {
  if (typeof process !== 'undefined' && process.env.PATCH_ACCOUNT_ID) {
    return process.env.PATCH_ACCOUNT_ID;
  }
  return '685275'; // Default account ID
};

/**
 * Create axios instance with auth headers
 */
const createApiClient = () => {
  return axios.create({
    baseURL: PATCH_API_BASE,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
  });
};

/**
 * Get all contacts (paginated)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Results per page (default: 50, max: 100)
 * @returns {Promise<object>} - Contact data with pagination info
 */
export async function getContacts(page = 1, limit = 50) {
  try {
    const api = createApiClient();
    const offset = (page - 1) * limit;

    const response = await api.get('/contacts', {
      params: { limit, offset }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching contacts from Patch:', error.message);
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }
}

/**
 * Search for contacts (returns all contacts, requires client-side filtering)
 * @returns {Promise<array>} - Array of all contacts
 */
export async function getAllContacts() {
  try {
    const contacts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getContacts(page, 100); // Max per page
      contacts.push(...result.data);

      // Check if there are more pages
      hasMore = result.to < result.total_count;
      page++;

      // Safety limit: stop after 100 pages (10,000 contacts)
      if (page > 100) {
        console.warn('Hit safety limit of 100 pages. Some contacts may not be loaded.');
        break;
      }
    }

    return contacts;
  } catch (error) {
    console.error('Error fetching all contacts:', error.message);
    throw error;
  }
}

/**
 * Create a new contact in Patch Retention
 * @param {object} contactData - Contact data (first_name, last_name, phone, email, etc.)
 * @returns {Promise<object>} - Created contact object
 */
export async function createContact(contactData) {
  try {
    const api = createApiClient();

    const response = await api.post('/contacts', contactData);

    console.log(`✅ Created contact: ${contactData.first_name} ${contactData.last_name} (${contactData.phone})`);
    return response.data;
  } catch (error) {
    console.error('Error creating contact:', error.response?.data || error.message);
    throw new Error(`Failed to create contact: ${error.message}`);
  }
}

/**
 * Update an existing contact in Patch Retention
 * @param {string} contactId - Patch contact ID (_id field)
 * @param {object} contactData - Updated contact data
 * @returns {Promise<object>} - Updated contact object
 */
export async function updateContact(contactId, contactData) {
  try {
    const api = createApiClient();

    const response = await api.patch(`/contacts/${contactId}`, contactData);

    console.log(`✏️  Updated contact: ${contactData.first_name} ${contactData.last_name} (${contactData.phone})`);
    return response.data;
  } catch (error) {
    console.error('Error updating contact:', error.response?.data || error.message);
    throw new Error(`Failed to update contact: ${error.message}`);
  }
}

/**
 * Get a single contact by ID
 * @param {string} contactId - Patch contact ID
 * @returns {Promise<object>} - Contact object
 */
export async function getContactById(contactId) {
  try {
    const api = createApiClient();

    const response = await api.get(`/contacts/${contactId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contact by ID:', error.message);
    throw new Error(`Failed to fetch contact: ${error.message}`);
  }
}
