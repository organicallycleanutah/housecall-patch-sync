/**
 * Health check endpoint
 * URL: https://your-project.vercel.app/api/health
 */

export default function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'Housecall Pro → Patch Retention Sync',
    timestamp: new Date().toISOString(),
    vercel: true
  });
}
