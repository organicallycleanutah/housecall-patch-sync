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

import { syncCustomer } from '../lib/sync.js';

export default async function handler(req, res) {
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

      // Set flag to fetch last service date
      if (customer) {
        console.log('Job completed event - will update last service date');
      }
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
    const result = await syncCustomer(customer, {
      isInitialSync: false,
      includeLastServiceDate: event === 'job.completed' // Fetch last service date for job events
    });

    // Return success response
    const responseMessage = result.action === 'created'
      ? 'Customer synced to Patch Retention (created)'
      : result.action === 'updated'
      ? 'Customer synced to Patch Retention (updated)'
      : 'Customer sync skipped (no changes needed)';

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
}
