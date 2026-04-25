import dotenv from 'dotenv';
import { join } from 'path';

// In CommonJS mode __dirname is a built-in global
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('Loaded server .env variables from:', envPath);
