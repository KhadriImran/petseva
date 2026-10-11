// Vercel serverless function: every /api/* request is rewritten here (see vercel.json).
// The NestJS API is compiled to apps/api/dist by scripts/vercel-build.js before this is bundled.
module.exports = require('../apps/api/dist/serverless.js').default;
