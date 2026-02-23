import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load server environment variables early so other modules see them
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

dotenv.config({ path: envPath });

// Optionally log minimal confirmation
console.log('Loaded server .env variables from:', envPath);
