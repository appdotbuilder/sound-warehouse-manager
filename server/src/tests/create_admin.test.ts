import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { type CreateAdminInput } from '../schema';
import { createAdmin } from '../handlers/create_admin';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateAdminInput = {
  username: 'testadmin',
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('createAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin user', async () => {
    const result = await createAdmin(testInput);

    // Basic field validation
    expect(result.username).toEqual('testadmin');
    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('testpassword123'); // Should be hashed
    expect(result.password_hash.length).toBeGreaterThan(20); // Bcrypt hashes are long
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save admin to database', async () => {
    const result = await createAdmin(testInput);

    // Query using proper drizzle syntax
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, result.id))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toEqual('testadmin');
    expect(admins[0].email).toEqual('test@example.com');
    expect(admins[0].password_hash).toBeDefined();
    expect(admins[0].created_at).toBeInstanceOf(Date);
    expect(admins[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await createAdmin(testInput);

    // Password should be hashed and verifiable
    const isValid = await Bun.password.verify('testpassword123', result.password_hash);
    expect(isValid).toBe(true);

    // Wrong password should not verify
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should enforce unique username constraint', async () => {
    // Create first admin
    await createAdmin(testInput);

    // Try to create another admin with same username
    const duplicateInput: CreateAdminInput = {
      username: 'testadmin', // Same username
      email: 'different@example.com',
      password: 'anotherpassword'
    };

    await expect(createAdmin(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first admin
    await createAdmin(testInput);

    // Try to create another admin with same email
    const duplicateInput: CreateAdminInput = {
      username: 'differentadmin',
      email: 'test@example.com', // Same email
      password: 'anotherpassword'
    };

    await expect(createAdmin(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different password lengths', async () => {
    const shortPasswordInput: CreateAdminInput = {
      username: 'shortpass',
      email: 'short@example.com',
      password: 'abc123' // Minimum length
    };

    const longPasswordInput: CreateAdminInput = {
      username: 'longpass',
      email: 'long@example.com',
      password: 'this_is_a_very_long_password_with_special_chars!@#$%^&*()_+'
    };

    // Both should work
    const shortResult = await createAdmin(shortPasswordInput);
    const longResult = await createAdmin(longPasswordInput);

    expect(shortResult.username).toEqual('shortpass');
    expect(longResult.username).toEqual('longpass');

    // Verify both passwords work
    const shortValid = await Bun.password.verify('abc123', shortResult.password_hash);
    const longValid = await Bun.password.verify('this_is_a_very_long_password_with_special_chars!@#$%^&*()_+', longResult.password_hash);
    
    expect(shortValid).toBe(true);
    expect(longValid).toBe(true);
  });

  it('should handle special characters in username and email', async () => {
    const specialInput: CreateAdminInput = {
      username: 'test_admin-123',
      email: 'test+admin@sub-domain.example.co.uk',
      password: 'specialpassword'
    };

    const result = await createAdmin(specialInput);

    expect(result.username).toEqual('test_admin-123');
    expect(result.email).toEqual('test+admin@sub-domain.example.co.uk');

    // Verify it's in database
    const admins = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, result.id))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].username).toEqual('test_admin-123');
    expect(admins[0].email).toEqual('test+admin@sub-domain.example.co.uk');
  });
});