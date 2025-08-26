import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type LoginAdminInput } from '../schema';
import { loginAdmin } from '../handlers/login_admin';

// Simple password hashing function for tests (same as in handler)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Test admin data
const testAdminData = {
  username: 'testadmin',
  email: 'test@example.com',
  password: 'password123',
};

describe('loginAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test admin with hashed password
    const hashedPassword = await hashPassword(testAdminData.password);
    
    const [createdAdmin] = await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .returning()
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username,
      password: testAdminData.password,
    };

    const result = await loginAdmin(loginInput);

    // Verify successful login
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdAdmin.id);
    expect(result!.username).toBe(testAdminData.username);
    expect(result!.email).toBe(testAdminData.email);
    expect(result!.password_hash).toBe(hashedPassword);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent username', async () => {
    const loginInput: LoginAdminInput = {
      username: 'nonexistent',
      password: 'anypassword',
    };

    const result = await loginAdmin(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test admin with hashed password
    const hashedPassword = await hashPassword(testAdminData.password);
    
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username,
      password: 'wrongpassword',
    };

    const result = await loginAdmin(loginInput);

    expect(result).toBeNull();
  });

  it('should handle empty password', async () => {
    // Create test admin with hashed password
    const hashedPassword = await hashPassword(testAdminData.password);
    
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username,
      password: '',
    };

    const result = await loginAdmin(loginInput);

    expect(result).toBeNull();
  });

  it('should handle case-sensitive username matching', async () => {
    // Create test admin with hashed password
    const hashedPassword = await hashPassword(testAdminData.password);
    
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username.toLowerCase(),
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username.toUpperCase(),
      password: testAdminData.password,
    };

    const result = await loginAdmin(loginInput);

    // Should return null because usernames are case-sensitive
    expect(result).toBeNull();
  });

  it('should work with different password complexities', async () => {
    const complexPassword = 'ComplexP@ssw0rd!123';
    const hashedPassword = await hashPassword(complexPassword);
    
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username,
      password: complexPassword,
    };

    const result = await loginAdmin(loginInput);

    expect(result).not.toBeNull();
    expect(result!.username).toBe(testAdminData.username);
  });

  it('should verify password against correct hash', async () => {
    // Create multiple admins with different passwords
    const password1 = 'password123';
    const password2 = 'differentpassword';
    
    const hash1 = await hashPassword(password1);
    const hash2 = await hashPassword(password2);
    
    await db.insert(adminsTable)
      .values([
        {
          username: 'admin1',
          email: 'admin1@example.com',
          password_hash: hash1,
        },
        {
          username: 'admin2',
          email: 'admin2@example.com',
          password_hash: hash2,
        }
      ])
      .execute();

    // Test admin1 with correct password
    const result1 = await loginAdmin({
      username: 'admin1',
      password: password1,
    });

    expect(result1).not.toBeNull();
    expect(result1!.username).toBe('admin1');

    // Test admin1 with admin2's password (should fail)
    const result2 = await loginAdmin({
      username: 'admin1',
      password: password2,
    });

    expect(result2).toBeNull();
  });

  it('should handle special characters in password', async () => {
    const specialPassword = 'p@$$w0rd!#$%^&*()';
    const hashedPassword = await hashPassword(specialPassword);
    
    await db.insert(adminsTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: hashedPassword,
      })
      .execute();

    const loginInput: LoginAdminInput = {
      username: testAdminData.username,
      password: specialPassword,
    };

    const result = await loginAdmin(loginInput);

    expect(result).not.toBeNull();
    expect(result!.username).toBe(testAdminData.username);
  });
});