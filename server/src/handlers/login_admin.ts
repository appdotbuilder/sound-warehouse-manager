import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type LoginAdminInput, type Admin } from '../schema';
import { eq } from 'drizzle-orm';

export const loginAdmin = async (input: LoginAdminInput): Promise<Admin | null> => {
  try {
    // Find admin by username
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.username, input.username))
      .execute();

    if (admins.length === 0) {
      return null; // Admin not found
    }

    const admin = admins[0];

    // For this implementation, we'll use a simple hash comparison
    // In a real application, you would use bcrypt or another secure hashing library
    const hashedInput = await hashPassword(input.password);
    
    if (hashedInput !== admin.password_hash) {
      return null; // Invalid password
    }

    // Return admin record (password_hash is included in the Admin type)
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      password_hash: admin.password_hash,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    };
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
};

// Simple password hashing function using Web Crypto API
// This is for demonstration purposes - use bcrypt in production
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}