import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable } from '../db/schema';
import { getAdmins } from '../handlers/get_admins';

describe('getAdmins', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no admins exist', async () => {
    const result = await getAdmins();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all admin users', async () => {
    // Create test admin users
    await db.insert(adminsTable)
      .values([
        {
          username: 'admin1',
          email: 'admin1@example.com',
          password_hash: 'hash1'
        },
        {
          username: 'admin2', 
          email: 'admin2@example.com',
          password_hash: 'hash2'
        },
        {
          username: 'admin3',
          email: 'admin3@example.com', 
          password_hash: 'hash3'
        }
      ])
      .execute();

    const result = await getAdmins();

    expect(result).toHaveLength(3);
    
    // Verify all expected fields are present
    result.forEach(admin => {
      expect(admin.id).toBeDefined();
      expect(admin.username).toBeDefined();
      expect(admin.email).toBeDefined();
      expect(admin.password_hash).toBeDefined();
      expect(admin.created_at).toBeInstanceOf(Date);
      expect(admin.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific admin data
    const usernames = result.map(admin => admin.username).sort();
    expect(usernames).toEqual(['admin1', 'admin2', 'admin3']);

    const emails = result.map(admin => admin.email).sort();
    expect(emails).toEqual(['admin1@example.com', 'admin2@example.com', 'admin3@example.com']);
  });

  it('should return admin users with correct data types', async () => {
    // Create a single test admin
    await db.insert(adminsTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'testhash123'
      })
      .execute();

    const result = await getAdmins();

    expect(result).toHaveLength(1);
    
    const admin = result[0];
    expect(typeof admin.id).toBe('number');
    expect(typeof admin.username).toBe('string');
    expect(typeof admin.email).toBe('string');
    expect(typeof admin.password_hash).toBe('string');
    expect(admin.created_at).toBeInstanceOf(Date);
    expect(admin.updated_at).toBeInstanceOf(Date);
  });

  it('should return admins in database insertion order', async () => {
    // Create admins in specific order
    const admin1 = await db.insert(adminsTable)
      .values({
        username: 'first',
        email: 'first@example.com',
        password_hash: 'hash1'
      })
      .returning()
      .execute();

    const admin2 = await db.insert(adminsTable)
      .values({
        username: 'second',
        email: 'second@example.com',
        password_hash: 'hash2'
      })
      .returning()
      .execute();

    const result = await getAdmins();

    expect(result).toHaveLength(2);
    
    // First admin should have lower ID (inserted first)
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[0].username).toEqual('first');
    expect(result[1].username).toEqual('second');
  });

  it('should include password_hash field in response', async () => {
    // Create test admin
    await db.insert(adminsTable)
      .values({
        username: 'securitytest',
        email: 'security@example.com',
        password_hash: 'sensitive_hash_123'
      })
      .execute();

    const result = await getAdmins();

    expect(result).toHaveLength(1);
    expect(result[0].password_hash).toEqual('sensitive_hash_123');
    
    // Note: In production, password_hash should typically be excluded
    // but the schema requires it, so we include it here
  });
});