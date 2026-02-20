/**
 * Intelligent merge logic - Decide whether to update existing contacts
 */

/**
 * Calculate data completeness score for a contact
 * Higher score = more complete data
 * @param {object} contact - Contact object
 * @returns {number} - Completeness score
 */
function calculateCompleteness(contact) {
  let score = 0;

  // Basic fields (1 point each)
  if (contact.first_name && contact.first_name.trim()) score++;
  if (contact.last_name && contact.last_name.trim()) score++;
  if (contact.phone && contact.phone.trim()) score++;
  if (contact.email && contact.email.trim()) score++;
  if (contact.city && contact.city.trim()) score++;

  // Address fields (0.5 points each)
  if (contact.street || contact.address) score += 0.5;
  if (contact.state) score += 0.5;
  if (contact.zip) score += 0.5;

  // Tags (0.5 point if present)
  if (contact.tags && contact.tags.length > 0) score += 0.5;

  return score;
}

/**
 * Check if Housecall Pro data is newer than Patch data
 * @param {object} hcCustomer - Housecall Pro customer object
 * @param {object} patchContact - Patch Retention contact object
 * @returns {boolean} - True if Housecall Pro data is newer
 */
function isNewerData(hcCustomer, patchContact) {
  try {
    // Check if both have updated_at timestamps
    if (!hcCustomer.updated_at || !patchContact.updated_at) {
      return false; // Can't determine, err on side of not updating
    }

    const hcDate = new Date(hcCustomer.updated_at);
    const patchDate = new Date(patchContact.updated_at);

    return hcDate > patchDate;
  } catch (error) {
    console.error('Error comparing dates:', error.message);
    return false;
  }
}

/**
 * Check if contact was manually edited in Patch (not via API)
 * If channel is not 'API', it means someone manually added/edited it
 * @param {object} patchContact - Patch Retention contact object
 * @returns {boolean} - True if manually edited
 */
function wasManuallyEdited(patchContact) {
  // If channel exists and is not 'API', it was manually created
  return patchContact.channel && patchContact.channel !== 'API';
}

/**
 * Decide whether to update an existing Patch contact with Housecall Pro data
 *
 * Update rules (in order of priority):
 * 1. If manually edited in Patch (channel !== 'API'), DON'T update
 * 2. If Housecall Pro data is newer, UPDATE
 * 3. If Housecall Pro data is more complete, UPDATE
 * 4. Otherwise, SKIP (don't update)
 *
 * @param {object} hcCustomer - Housecall Pro customer object
 * @param {object} patchContact - Existing Patch Retention contact object
 * @returns {boolean} - True if should update, false if should skip
 */
export function shouldUpdate(hcCustomer, patchContact) {
  // Rule 1: Don't overwrite manually edited contacts
  if (wasManuallyEdited(patchContact)) {
    console.log(`⏭️  Skipping update - contact was manually edited in Patch (channel: ${patchContact.channel})`);
    return false;
  }

  // Rule 2: If Housecall Pro data is newer, update
  if (isNewerData(hcCustomer, patchContact)) {
    console.log('📅 Updating - Housecall Pro data is newer');
    return true;
  }

  // Rule 3: If Housecall Pro data is more complete, update
  const hcCompleteness = calculateCompleteness(hcCustomer);
  const patchCompleteness = calculateCompleteness(patchContact);

  if (hcCompleteness > patchCompleteness) {
    console.log(`📊 Updating - Housecall Pro data is more complete (${hcCompleteness} vs ${patchCompleteness})`);
    return true;
  }

  // Rule 4: Default - don't update
  console.log(`⏭️  Skipping update - Patch data is current and complete`);
  return false;
}

/**
 * Merge strategy: Decide whether to create, update, or skip
 * @param {object} hcCustomer - Housecall Pro customer
 * @param {object|null} existingContact - Existing Patch contact (or null if not found)
 * @returns {object} - Decision object { action: 'create'|'update'|'skip', contact: existingContact }
 */
export function decideMergeStrategy(hcCustomer, existingContact) {
  if (!existingContact) {
    return { action: 'create', contact: null };
  }

  if (shouldUpdate(hcCustomer, existingContact)) {
    return { action: 'update', contact: existingContact };
  }

  return { action: 'skip', contact: existingContact };
}
