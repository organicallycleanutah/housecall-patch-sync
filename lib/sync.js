/**
 * Main sync function - Orchestrates the sync process
 */

import { findContactByPhone } from './dedup.js';
import { decideMergeStrategy } from './merge.js';
import { transformCustomer, transformCustomerSync } from './transform.js';
import { createContact, updateContact } from './patchApi.js';

/**
 * Sync a single customer from Housecall Pro to Patch Retention
 *
 * Process:
 * 1. Transform Housecall Pro customer to Patch format
 * 2. Check if contact already exists (by phone)
 * 3. Decide: create new, update existing, or skip
 * 4. Execute the action
 *
 * @param {object} customer - Housecall Pro customer object
 * @param {object} options - Sync options
 * @param {Map} options.phoneLookup - Optional pre-built phone lookup map (for bulk syncs)
 * @param {boolean} options.isInitialSync - Whether this is part of initial bulk sync
 * @param {boolean} options.includeLastServiceDate - Whether to fetch last service date (default: false for speed)
 * @returns {Promise<object>} - Sync result { action: 'created'|'updated'|'skipped', contact: patchContact }
 */
export async function syncCustomer(customer, options = {}) {
  const {
    phoneLookup = null,
    isInitialSync = false,
    includeLastServiceDate = false
  } = options;

  try {
    // Step 1: Transform customer data
    let patchData;
    if (includeLastServiceDate) {
      patchData = await transformCustomer(customer, { isInitialSync, includeLastServiceDate });
    } else {
      patchData = transformCustomerSync(customer, isInitialSync);
    }

    // Validate required fields
    if (!patchData.phone) {
      console.warn(`⚠️  Skipping customer ${customer.first_name} ${customer.last_name} - no phone number`);
      return { action: 'skipped', reason: 'no_phone', customer };
    }

    // Step 2: Find existing contact by phone
    const existingContact = await findContactByPhone(patchData.phone, phoneLookup);

    // Step 3: Decide merge strategy
    const decision = decideMergeStrategy(customer, existingContact);

    // Step 4: Execute action
    switch (decision.action) {
      case 'create':
        const createdContact = await createContact(patchData);
        return { action: 'created', contact: createdContact, customer };

      case 'update':
        const updatedContact = await updateContact(decision.contact._id, patchData);
        return { action: 'updated', contact: updatedContact, customer };

      case 'skip':
        console.log(`⏭️  Skipped: ${customer.first_name} ${customer.last_name} (${patchData.phone})`);
        return { action: 'skipped', contact: decision.contact, customer };

      default:
        throw new Error(`Unknown action: ${decision.action}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing customer ${customer.first_name} ${customer.last_name}:`, error.message);
    return {
      action: 'error',
      error: error.message,
      customer
    };
  }
}

/**
 * Sync multiple customers in batch
 * @param {array} customers - Array of Housecall Pro customers
 * @param {object} options - Sync options
 * @returns {Promise<object>} - Batch sync results { created: number, updated: number, skipped: number, errors: number, details: [] }
 */
export async function syncBatch(customers, options = {}) {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  console.log(`\n🔄 Starting batch sync of ${customers.length} customers...\n`);

  for (const customer of customers) {
    const result = await syncCustomer(customer, options);

    results.details.push(result);

    switch (result.action) {
      case 'created':
        results.created++;
        break;
      case 'updated':
        results.updated++;
        break;
      case 'skipped':
        results.skipped++;
        break;
      case 'error':
        results.errors++;
        break;
    }

    // Rate limiting: small delay between requests (100ms)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Batch sync complete:`);
  console.log(`   Created: ${results.created}`);
  console.log(`   Updated: ${results.updated}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);
  console.log(`   Total: ${customers.length}\n`);

  return results;
}
