/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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
