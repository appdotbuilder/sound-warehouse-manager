import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type Admin } from '../schema';

export const getAdmins = async (): Promise<Admin[]> => {
  try {
    // Fetch all admin users from the database
    const results = await db.select()
      .from(adminsTable)
      .execute();

    // Return the results - password_hash is included as per schema requirement
    // In production, you might want to exclude password_hash for security
    return results;
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    throw error;
  }
};