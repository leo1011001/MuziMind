import dotenv from 'dotenv';
import { join } from 'path';
import dns from 'dns';

// Force IPv4 for all DNS lookups — Railway blocks IPv6 outbound (SMTP etc.)
dns.setDefaultResultOrder('ipv4first');

// In CommonJS mode __dirname is a built-in global
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('Loaded server .env variables from:', envPath);
