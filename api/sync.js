/**
 * Vercel Serverless Function - Webhook endpoint for Housecall Pro
 *
 * This endpoint receives webhook events from Housecall Pro when:
 * - A new customer is created
 * - A customer is updated
 * - A job is completed (to update last service date)
 *
 * URL: https://your-project.vercel.app/api/sync
 */

const axios = require('axios');

// Simple inline sync function to avoid module issues
async function syncCustomer(customer) {
  try {
    const PATCH_API_KEY = process.env.PATCH_API_KEY;
    const PATCH_ACCOUNT_ID = process.env.PATCH_ACCOUNT_ID;

    if (!PATCH_API_KEY) {
      throw new Error('PATCH_API_KEY not configured');
    }

    // Transform customer data to Patch format
    const patchContact = {
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.mobile_number || customer.home_number || '',
      email: customer.email || '',
      tags: ['Source:housecallpro', 'Sync:realtime']
    };

    // Add city if available
    if (customer.addresses && customer.addresses.length > 0) {
      const address = customer.addresses[0];
      if (address.city) patchContact.city = address.city;
    }

    // Skip if no phone
    if (!patchContact.phone) {
      console.log('Skipping - no phone number');
      return { action: 'skipped', reason: 'no_phone' };
    }

    // Create contact in Patch Retention
    const response = await axios.post(
      'https://api.citygro.com/v2/contacts',
      patchContact,
      {
        headers: {
          'Authorization': `Bearer ${PATCH_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Created contact: ${patchContact.first_name} ${patchContact.last_name}`);
    return { action: 'created', contact: response.data };

  } catch (error) {
    // If error is 409 or duplicate, that's okay - contact already exists
    if (error.response && (error.response.status === 409 || error.response.status === 400)) {
      console.log('Contact already exists or validation error');
      return { action: 'skipped', reason: 'duplicate_or_validation' };
    }

    console.error('Sync error:', error.message);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. This endpoint only accepts POST requests.'
    });
  }

  try {
    console.log('📥 Received webhook from Housecall Pro');

    // Extract data from webhook payload
    const { event, data } = req.body;

    console.log(`Event type: ${event}`);

    // Handle different event types
    let customer = null;

    if (event === 'customer.created' || event === 'customer.updated') {
      // Direct customer data
      customer = data;
    } else if (event === 'job.completed') {
      // Extract customer from job data
      customer = data.customer;
    } else {
      // Unknown event type
      console.log(`⚠️  Unsupported event type: ${event}`);
      return res.status(200).json({
        success: true,
        message: 'Event type not handled',
        event
      });
    }

    // Validate customer data
    if (!customer || !customer.first_name) {
      console.error('❌ Invalid customer data in webhook');
      return res.status(400).json({
        success: false,
        error: 'Invalid customer data'
      });
    }

    // Sync customer to Patch Retention
    const result = await syncCustomer(customer);

    // Return success response
    const responseMessage = result.action === 'created'
      ? 'Customer synced to Patch Retention (created)'
      : 'Customer sync skipped (already exists or no phone)';

    return res.status(200).json({
      success: true,
      message: responseMessage,
      action: result.action,
      contact_id: result.contact?._id || null
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
