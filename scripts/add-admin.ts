// scripts/add-admin.ts
// Run with: npx ts-node scripts/add-admin.ts

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { admins, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function addAdmin() {
  const adminEmail = 'achyutkpaliwal@gmail.com';
  
  console.log('Adding admin:', adminEmail);
  
  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(admins)
      .where(eq(admins.email, adminEmail))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('Admin already exists!');
      return;
    }
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    
    // Insert admin
    await db.insert(admins).values({
      email: adminEmail,
      firstName: 'Achyut',
      lastName: 'Paliwal',
      userId: existingUser[0]?.id || null,
      clerkUserId: existingUser[0]?.clerkUserId || null,
    });
    
    console.log('Admin added successfully!');
  } catch (error) {
    console.error('Error adding admin:', error);
  }
}

addAdmin();
