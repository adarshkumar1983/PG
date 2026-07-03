import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load from root .env or server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
console.log('Using URI:', uri);

if (!uri) {
  console.error('MONGODB_URI is not defined in env');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: MONGODB connection failed:', err);
    process.exit(1);
  });
