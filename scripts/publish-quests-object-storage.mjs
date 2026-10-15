/**
 * Retired. Uploading a directory used to replace catalog.json with only
 * the files in that directory and drop every other official quest.
 *
 *   npm run publish:quest -- <quest.json | dir> [--access open|account|paid] [--dry-run] [--skip-economy]
 */

console.error(
  "This uploader no longer writes to the bucket.\n" +
    "Use: npm run publish:quest -- <quest.json | dir> [--access open|account|paid] [--dry-run] [--skip-economy]"
);
process.exit(1);
