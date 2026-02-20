/**
 * Deduplication logic - Find existing contacts in Patch Retention
 */

import { getAllContacts } from './patchApi.js';

// Cache for contacts (to avoid fetching all contacts repeatedly)
let contactsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize phone number for comparison
 * Removes spaces, dashes, parentheses, and leading +1
 * @param {string} phone - Phone number
 * @returns {string} - Normalized phone number (digits only)
 */
export function normalizePhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');

  // Remove leading '1' if it's a US number (11 digits starting with 1)
  if (normalized.length === 11 && normalized.startsWith('1')) {
    normalized = normalized.substring(1);
  }

  return normalized;
}

/**
 * Build a phone number lookup map from Patch contacts
 * @param {boolean} forceRefresh - Force refresh cache (default: false)
 * @returns {Promise<Map>} - Map of normalized phone -> contact object
 */
export async function buildPhoneLookup(forceRefresh = false) {
  try {
    // Check cache
    const now = Date.now();
    if (
      !forceRefresh &&
      contactsCache &&
      cacheTimestamp &&
      (now - cacheTimestamp) < CACHE_TTL
    ) {
      console.log('Using cached contacts lookup');
      return contactsCache;
    }

    console.log('Building phone number lookup from Patch Retention...');

    // Fetch all contacts from Patch
    const contacts = await getAllContacts();

    // Build lookup map: normalized phone -> contact
    const phoneLookup = new Map();

    contacts.forEach(contact => {
      if (contact.phone) {
        const normalizedPhone = normalizePhone(contact.phone);
        if (normalizedPhone) {
          // Store contact with normalized phone as key
          phoneLookup.set(normalizedPhone, contact);
        }
      }
    });

    console.log(`Built lookup with ${phoneLookup.size} phone numbers from ${contacts.length} total contacts`);

    // Update cache
    contactsCache = phoneLookup;
    cacheTimestamp = now;

    return phoneLookup;
  } catch (error) {
    console.error('Error building phone lookup:', error.message);
    throw error;
  }
}

/**
 * Find existing contact in Patch by phone number
 * @param {string} phone - Phone number to search for
 * @param {Map} phoneLookup - Optional pre-built phone lookup map
 * @returns {Promise<object|null>} - Existing contact or null
 */
export async function findContactByPhone(phone, phoneLookup = null) {
  if (!phone) {
    return null;
  }

  try {
    // Build lookup if not provided
    const lookup = phoneLookup || await buildPhoneLookup();

    // Normalize the search phone
    const normalizedPhone = normalizePhone(phone);

    // Lookup in map
    const existingContact = lookup.get(normalizedPhone);

    if (existingContact) {
      console.log(`Found existing contact for phone ${phone}: ${existingContact.first_name} ${existingContact.last_name}`);
      return existingContact;
    }

    return null;
  } catch (error) {
    console.error('Error finding contact by phone:', error.message);
    return null; // Return null on error (fail gracefully)
  }
}

/**
 * Find existing contact by email (fallback method)
 * @param {string} email - Email to search for
 * @param {Map} phoneLookup - Optional pre-built phone lookup map (contains all contacts)
 * @returns {Promise<object|null>} - Existing contact or null
 */
export async function findContactByEmail(email, phoneLookup = null) {
  if (!email) {
    return null;
  }

  try {
    // Build lookup if not provided
    const lookup = phoneLookup || await buildPhoneLookup();

    // Search through all contacts for matching email
    for (const contact of lookup.values()) {
      if (contact.email && contact.email.toLowerCase() === email.toLowerCase()) {
        console.log(`Found existing contact for email ${email}: ${contact.first_name} ${contact.last_name}`);
        return contact;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding contact by email:', error.message);
    return null;
  }
}

/**
 * Clear the contacts cache (useful for testing or manual refresh)
 */
export function clearCache() {
  contactsCache = null;
  cacheTimestamp = null;
  console.log('Contacts cache cleared');
}
