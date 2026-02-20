/**
 * Bulk Sync Script - One-time migration of all Housecall Pro customers to Patch Retention
 *
 * Run this script from your local computer to perform the initial sync of all 1,510 customers.
 *
 * Usage:
 *   1. Create .env file with your API keys (copy from .env.example)
 *   2. Run: npm install
 *   3. Run: npm run bulk-sync
 */

import dotenv from 'dotenv';
import { getAllCustomers } from '../lib/housecallApi.js';
import { buildPhoneLookup } from '../lib/dedup.js';
import { syncBatch } from '../lib/sync.js';

// Load environment variables from .env file
dotenv.config();

// Configuration
const BATCH_SIZE = 50; // Process 50 customers at a time

/**
 * Main bulk sync function
 */
async function runBulkSync() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Housecall Pro → Patch Retention Bulk Sync           ║');
  console.log('║  One-time migration of all existing customers         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Fetch all customers from Housecall Pro
    console.log('📥 Step 1: Fetching all customers from Housecall Pro...\n');
    const allCustomers = await getAllCustomers();

    console.log(`✅ Fetched ${allCustomers.length} customers from Housecall Pro\n`);

    // Step 2: Build phone lookup from Patch Retention (for deduplication)
    console.log('📥 Step 2: Building contact lookup from Patch Retention...\n');
    const phoneLookup = await buildPhoneLookup(true); // Force refresh

    console.log(`✅ Built lookup with ${phoneLookup.size} existing contacts\n`);

    // Step 3: Process customers in batches
    console.log(`📥 Step 3: Syncing ${allCustomers.length} customers in batches of ${BATCH_SIZE}...\n`);

    const totalBatches = Math.ceil(allCustomers.length / BATCH_SIZE);
    let batchNumber = 1;

    const aggregateResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (let i = 0; i < allCustomers.length; i += BATCH_SIZE) {
      const batch = allCustomers.slice(i, i + BATCH_SIZE);

      console.log(`\n--- Batch ${batchNumber}/${totalBatches} (${batch.length} customers) ---`);

      const batchResults = await syncBatch(batch, {
        phoneLookup,
        isInitialSync: true,
        includeLastServiceDate: false // Skip for speed (can update later)
      });

      // Aggregate results
      aggregateResults.created += batchResults.created;
      aggregateResults.updated += batchResults.updated;
      aggregateResults.skipped += batchResults.skipped;
      aggregateResults.errors += batchResults.errors;

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, allCustomers.length)}/${allCustomers.length} customers processed`);

      batchNumber++;

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < allCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Final summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  🎉 BULK SYNC COMPLETE!                               ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📊 Final Results:');
    console.log(`   ✅ Created:  ${aggregateResults.created} new contacts`);
    console.log(`   ✏️  Updated:  ${aggregateResults.updated} existing contacts`);
    console.log(`   ⏭️  Skipped:  ${aggregateResults.skipped} contacts (no changes)`);
    console.log(`   ❌ Errors:   ${aggregateResults.errors} failed syncs`);
    console.log(`   📈 Total:    ${allCustomers.length} customers processed\n`);

    console.log('✅ All Housecall Pro customers are now synced to Patch Retention!');
    console.log('✅ Real-time webhook sync will handle new/updated customers going forward.\n');

  } catch (error) {
    console.error('\n❌ Bulk sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the bulk sync
runBulkSync();
