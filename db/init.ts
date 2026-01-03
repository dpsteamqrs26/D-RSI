// db/init.ts
// Run this file once to initialize your database with the admin user

import { db } from './index';
import { admins } from './schema';
import { eq } from 'drizzle-orm';

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(admins)
      .where(eq(admins.email, 'achyutkpaliwal@gmail.com'))
      .limit(1);

    if (existingAdmin.length === 0) {
      // Add admin user
      await db.insert(admins).values({
        email: 'achyutkpaliwal@gmail.com',
      });
      console.log('✅ Admin user created: achyutkpaliwal@gmail.com');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();