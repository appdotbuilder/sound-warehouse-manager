import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable, equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { type GetTransactionsQuery } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data
const testAdmin = {
  username: 'testadmin',
  email: 'admin@test.com',
  password_hash: 'hashed_password_123'
};

const testEquipment = {
  name: 'Test Laptop',
  serial_number: 'TL001',
  description: 'A laptop for testing',
  category: 'Electronics',
  brand: 'TestBrand',
  model: 'TM100',
  status: 'available' as const
};

const secondEquipment = {
  name: 'Test Camera',
  serial_number: 'TC001',
  description: 'A camera for testing',
  category: 'Electronics',
  brand: 'CamBrand',
  model: 'CM200',
  status: 'available' as const
};

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    
    expect(result).toEqual([]);
  });

  it('should return all transactions without filters', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create test transactions
    const transaction1 = {
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out' as const,
      user_name: 'John Doe',
      user_contact: 'john@example.com',
      notes: 'First transaction',
      expected_return_date: new Date('2024-01-15')
    };

    const transaction2 = {
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_in' as const,
      user_name: 'John Doe',
      user_contact: 'john@example.com',
      notes: 'Return transaction',
      actual_return_date: new Date('2024-01-14')
    };

    await db.insert(equipmentTransactionsTable)
      .values([transaction1, transaction2])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    expect(result[0].transaction_type).toBeDefined();
    expect(result[0].user_name).toBeDefined();
    expect(result[0].equipment_id).toEqual(equipment.id);
    expect(result[0].admin_id).toEqual(admin.id);
    expect(result[0].transaction_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by equipment_id', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment1] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    const [equipment2] = await db.insert(equipmentTable)
      .values(secondEquipment)
      .returning()
      .execute();

    // Create transactions for both equipment items
    const transactions = [
      {
        equipment_id: equipment1.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'User One',
        user_contact: 'user1@example.com'
      },
      {
        equipment_id: equipment2.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'User Two',
        user_contact: 'user2@example.com'
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    // Test filtering by first equipment
    const query: GetTransactionsQuery = {
      equipment_id: equipment1.id
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].equipment_id).toEqual(equipment1.id);
    expect(result[0].user_name).toEqual('User One');
  });

  it('should filter transactions by admin_id', async () => {
    // Create two admins
    const admin1 = {
      username: 'admin1',
      email: 'admin1@test.com',
      password_hash: 'hash1'
    };

    const admin2 = {
      username: 'admin2',
      email: 'admin2@test.com',
      password_hash: 'hash2'
    };

    const [createdAdmin1] = await db.insert(adminsTable)
      .values(admin1)
      .returning()
      .execute();

    const [createdAdmin2] = await db.insert(adminsTable)
      .values(admin2)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create transactions by different admins
    const transactions = [
      {
        equipment_id: equipment.id,
        admin_id: createdAdmin1.id,
        transaction_type: 'check_out' as const,
        user_name: 'User for Admin1'
      },
      {
        equipment_id: equipment.id,
        admin_id: createdAdmin2.id,
        transaction_type: 'check_in' as const,
        user_name: 'User for Admin2'
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    const query: GetTransactionsQuery = {
      admin_id: createdAdmin1.id
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].admin_id).toEqual(createdAdmin1.id);
    expect(result[0].user_name).toEqual('User for Admin1');
  });

  it('should filter transactions by transaction_type', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create different types of transactions
    const transactions = [
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'Check Out User'
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_in' as const,
        user_name: 'Check In User'
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'booking' as const,
        user_name: 'Booking User'
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    const query: GetTransactionsQuery = {
      transaction_type: 'booking'
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_type).toEqual('booking');
    expect(result[0].user_name).toEqual('Booking User');
  });

  it('should filter transactions by date range', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create transactions with different dates
    const oldDate = new Date('2024-01-01');
    const recentDate = new Date('2024-01-15');

    const transactions = [
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'Old Transaction',
        transaction_date: oldDate
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_in' as const,
        user_name: 'Recent Transaction',
        transaction_date: recentDate
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    // Test date range filtering
    const query: GetTransactionsQuery = {
      start_date: new Date('2024-01-10'),
      end_date: new Date('2024-01-20')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_name).toEqual('Recent Transaction');
    expect(result[0].transaction_date >= query.start_date!).toBe(true);
    expect(result[0].transaction_date <= query.end_date!).toBe(true);
  });

  it('should filter transactions with multiple criteria', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment1] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    const [equipment2] = await db.insert(equipmentTable)
      .values(secondEquipment)
      .returning()
      .execute();

    // Create various transactions
    const transactions = [
      {
        equipment_id: equipment1.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'Match All Criteria',
        transaction_date: new Date('2024-01-15')
      },
      {
        equipment_id: equipment1.id,
        admin_id: admin.id,
        transaction_type: 'check_in' as const,
        user_name: 'Wrong Type',
        transaction_date: new Date('2024-01-15')
      },
      {
        equipment_id: equipment2.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'Wrong Equipment',
        transaction_date: new Date('2024-01-15')
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    const query: GetTransactionsQuery = {
      equipment_id: equipment1.id,
      transaction_type: 'check_out',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_name).toEqual('Match All Criteria');
    expect(result[0].equipment_id).toEqual(equipment1.id);
    expect(result[0].transaction_type).toEqual('check_out');
  });

  it('should return transactions ordered by transaction date descending', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create transactions with different dates
    const transactions = [
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_out' as const,
        user_name: 'Middle Transaction',
        transaction_date: new Date('2024-01-10')
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_in' as const,
        user_name: 'Latest Transaction',
        transaction_date: new Date('2024-01-20')
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'booking' as const,
        user_name: 'Earliest Transaction',
        transaction_date: new Date('2024-01-01')
      }
    ];

    await db.insert(equipmentTransactionsTable)
      .values(transactions)
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(3);
    // Should be ordered by transaction_date descending (most recent first)
    expect(result[0].user_name).toEqual('Latest Transaction');
    expect(result[1].user_name).toEqual('Middle Transaction');
    expect(result[2].user_name).toEqual('Earliest Transaction');

    // Verify dates are actually in descending order
    expect(result[0].transaction_date >= result[1].transaction_date).toBe(true);
    expect(result[1].transaction_date >= result[2].transaction_date).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    // Create prerequisite data
    const [admin] = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();

    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Create transaction with nullable fields as null
    const transaction = {
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out' as const,
      user_name: 'Test User',
      user_contact: null,
      notes: null,
      expected_return_date: null,
      actual_return_date: null
    };

    await db.insert(equipmentTransactionsTable)
      .values(transaction)
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].user_contact).toBeNull();
    expect(result[0].notes).toBeNull();
    expect(result[0].expected_return_date).toBeNull();
    expect(result[0].actual_return_date).toBeNull();
    expect(result[0].user_name).toEqual('Test User');
  });
});