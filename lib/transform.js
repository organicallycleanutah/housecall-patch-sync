/**
 * Data transformation - Convert Housecall Pro format to Patch Retention format
 */

import { getLastServiceDate } from './housecallApi.js';

/**
 * Extract city from address object
 * @param {array} addresses - Housecall Pro addresses array
 * @returns {string|null} - City name
 */
function extractCity(addresses) {
  if (!addresses || addresses.length === 0) return null;

  // Get first service address
  const serviceAddress = addresses.find(addr => addr.type === 'service') || addresses[0];

  return serviceAddress.city || null;
}

/**
 * Extract full street address
 * @param {array} addresses - Housecall Pro addresses array
 * @returns {string|null} - Full street address
 */
function extractStreet(addresses) {
  if (!addresses || addresses.length === 0) return null;

  const serviceAddress = addresses.find(addr => addr.type === 'service') || addresses[0];

  let street = serviceAddress.street || '';
  if (serviceAddress.street_line_2) {
    street += ` ${serviceAddress.street_line_2}`;
  }

  return street.trim() || null;
}

/**
 * Extract state from address
 * @param {array} addresses - Housecall Pro addresses array
 * @returns {string|null} - State code
 */
function extractState(addresses) {
  if (!addresses || addresses.length === 0) return null;

  const serviceAddress = addresses.find(addr => addr.type === 'service') || addresses[0];

  return serviceAddress.state || null;
}

/**
 * Extract zip code from address
 * @param {array} addresses - Housecall Pro addresses array
 * @returns {string|null} - ZIP code
 */
function extractZip(addresses) {
  if (!addresses || addresses.length === 0) return null;

  const serviceAddress = addresses.find(addr => addr.type === 'service') || addresses[0];

  return serviceAddress.zip || null;
}

/**
 * Build tags array for Patch contact
 * @param {object} customer - Housecall Pro customer
 * @param {string} lastServiceDate - Last service date (ISO string)
 * @param {boolean} isInitialSync - Whether this is part of initial bulk sync
 * @returns {array} - Array of tags
 */
function buildTags(customer, lastServiceDate, isInitialSync = false) {
  const tags = [];

  // Add source tag
  tags.push('Source:housecallpro');

  // Add sync type tag
  if (isInitialSync) {
    tags.push('Sync:initial');
  } else {
    tags.push('Sync:realtime');
  }

  // Add state tag if available
  if (customer.addresses && customer.addresses.length > 0) {
    const state = extractState(customer.addresses);
    if (state) {
      tags.push(`State:${state}`);
    }
  }

  // Add service status tag
  if (lastServiceDate) {
    tags.push('Has-Service-History');
  }

  // Preserve any existing Housecall Pro tags
  if (customer.tags && Array.isArray(customer.tags)) {
    tags.push(...customer.tags);
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Transform Housecall Pro customer to Patch Retention contact format
 * @param {object} customer - Housecall Pro customer object
 * @param {object} options - Transformation options
 * @param {boolean} options.isInitialSync - Whether this is part of initial bulk sync
 * @param {boolean} options.includeLast ServiceDate - Whether to fetch and include last service date
 * @returns {Promise<object>} - Patch Retention contact object
 */
export async function transformCustomer(customer, options = {}) {
  const { isInitialSync = false, includeLastServiceDate = true } = options;

  try {
    // Fetch last service date if requested
    let lastServiceDate = null;
    if (includeLastServiceDate && customer.id) {
      lastServiceDate = await getLastServiceDate(customer.id);
    }

    // Build Patch contact object
    const patchContact = {
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.mobile_number || customer.home_number || '',
      email: customer.email || '',
      city: extractCity(customer.addresses),
      tags: buildTags(customer, lastServiceDate, isInitialSync)
    };

    // Add optional fields only if they have values
    const street = extractStreet(customer.addresses);
    if (street) {
      patchContact.address = street; // Patch uses 'address' field for street
    }

    const state = extractState(customer.addresses);
    const zip = extractZip(customer.addresses);

    // Store state and zip in tags if not supported as fields
    if (state) {
      // Already added to tags above
    }

    if (zip) {
      patchContact.tags.push(`ZIP:${zip}`);
    }

    // Add last service date as custom field (if Patch API supports it)
    // For now, we'll add it as a tag
    if (lastServiceDate) {
      const serviceDate = new Date(lastServiceDate).toISOString().split('T')[0]; // YYYY-MM-DD
      patchContact.tags.push(`LastService:${serviceDate}`);
    }

    // Remove any empty/null fields
    Object.keys(patchContact).forEach(key => {
      if (patchContact[key] === null || patchContact[key] === undefined || patchContact[key] === '') {
        delete patchContact[key];
      }
    });

    return patchContact;
  } catch (error) {
    console.error('Error transforming customer data:', error.message);
    throw new Error(`Failed to transform customer: ${error.message}`);
  }
}

/**
 * Transform customer synchronously (without fetching last service date)
 * Faster for bulk operations
 * @param {object} customer - Housecall Pro customer object
 * @param {boolean} isInitialSync - Whether this is part of initial bulk sync
 * @returns {object} - Patch Retention contact object
 */
export function transformCustomerSync(customer, isInitialSync = false) {
  // Build Patch contact object (without async operations)
  const patchContact = {
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    phone: customer.mobile_number || customer.home_number || '',
    email: customer.email || '',
    city: extractCity(customer.addresses),
    tags: buildTags(customer, null, isInitialSync)
  };

  // Add optional fields
  const street = extractStreet(customer.addresses);
  if (street) {
    patchContact.address = street;
  }

  const state = extractState(customer.addresses);
  const zip = extractZip(customer.addresses);

  if (zip) {
    patchContact.tags.push(`ZIP:${zip}`);
  }

  // Remove empty fields
  Object.keys(patchContact).forEach(key => {
    if (patchContact[key] === null || patchContact[key] === undefined || patchContact[key] === '') {
      delete patchContact[key];
    }
  });

  return patchContact;
}
