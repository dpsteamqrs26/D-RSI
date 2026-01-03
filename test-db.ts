// test-db.ts
import { db } from './db/index';
import { courses, lessons, users } from './db/schema';

async function test() {
  console.log('Testing database connection...');
  try {
    const allCourses = await db.select().from(courses);
    console.log('Courses count:', allCourses.length);
    console.log('Courses:', JSON.stringify(allCourses, null, 2));

    const allLessons = await db.select().from(lessons);
    console.log('Lessons count:', allLessons.length);

    const allUsers = await db.select().from(users);
    console.log('Users count:', allUsers.length);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

test().catch(console.error);
