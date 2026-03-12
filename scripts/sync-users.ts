import { createClerkClient } from '@clerk/clerk-sdk-node';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

// Load environment variables from .env file in the root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!clerkSecretKey) {
  console.error('Error: CLERK_SECRET_KEY is not set in .env');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set in .env');
  process.exit(1);
}

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
const sql = neon(databaseUrl);
const db = drizzle(sql);

async function syncUsers() {
  console.log('🔄 Starting Clerk to PostgreSQL sync...');
  try {
    // 1. Fetch all users from Clerk
    console.log('Fetching users from Clerk...');
    const userList = await clerkClient.users.getUserList({
      limit: 100, // Adjust if you have more than 100 users
    });
    
    console.log(`Found ${userList.data.length} users in Clerk.`);

    if (userList.data.length === 0) {
      console.log('No users to sync.');
      return;
    }

    // 2. Insert or update each user in the database
    let syncedCount = 0;
    for (const clerkUser of userList.data) {
      const clerkId = clerkUser.id;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.clerkId, clerkId));

      if (existingUser.length === 0) {
        // Insert new user
        console.log(`Inserting new user: ${clerkId}`);
        await db.insert(users).values({
          clerkId,
          xp: 0,
          currentLevel: 'RED',
          streak: 0,
        });
        syncedCount++;
      } else {
        console.log(`User already exists: ${clerkId}`);
      }
    }

    console.log(`✅ Sync complete. Successfully synced ${syncedCount} new users.`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
  } finally {
    process.exit(0);
  }
}

syncUsers();
