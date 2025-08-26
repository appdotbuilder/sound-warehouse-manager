import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable, equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { getEquipmentWithTransactions } from '../handlers/get_equipment_with_transactions';

// Test data
const testAdmin = {
  username: 'testadmin',
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
};

const testEquipment = {
  name: 'Test Camera',
  serial_number: 'CAM001',
  description: 'Professional DSLR Camera',
  category: 'Photography',
  brand: 'Canon',
  model: 'EOS R5',
  status: 'available' as const,
};

describe('getEquipmentWithTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent equipment', async () => {
    const result = await getEquipmentWithTransactions(999);
    expect(result).toBeNull();
  });

  it('should return equipment with empty transactions array when no transactions exist', async () => {
    // Create equipment
    const equipmentResults = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.equipment.id).toBe(equipment.id);
    expect(result!.equipment.name).toBe('Test Camera');
    expect(result!.equipment.serial_number).toBe('CAM001');
    expect(result!.equipment.status).toBe('available');
    expect(result!.transactions).toHaveLength(0);
    expect(result!.current_user).toBeNull();
  });

  it('should return equipment with transactions ordered by date descending', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment
    const equipmentResults = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create multiple transactions with different dates
    const olderDate = new Date('2024-01-01');
    const newerDate = new Date('2024-01-02');

    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out',
      user_name: 'John Doe',
      user_contact: 'john@example.com',
      transaction_date: olderDate,
      expected_return_date: new Date('2024-01-05'),
    }).execute();

    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_in',
      user_name: 'John Doe',
      user_contact: 'john@example.com',
      transaction_date: newerDate,
      actual_return_date: newerDate,
    }).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.transactions).toHaveLength(2);
    
    // Should be ordered by transaction_date descending (newer first)
    expect(result!.transactions[0].transaction_type).toBe('check_in');
    expect(result!.transactions[0].transaction_date.getTime()).toBe(newerDate.getTime());
    expect(result!.transactions[1].transaction_type).toBe('check_out');
    expect(result!.transactions[1].transaction_date.getTime()).toBe(olderDate.getTime());
  });

  it('should identify current user for checked out equipment', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment with checked_out status
    const equipmentResults = await db.insert(equipmentTable)
      .values({ ...testEquipment, status: 'checked_out' })
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create check-out transaction without return
    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out',
      user_name: 'Jane Smith',
      user_contact: 'jane@example.com',
      expected_return_date: new Date('2024-12-31'),
    }).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.equipment.status).toBe('checked_out');
    expect(result!.current_user).toBe('Jane Smith');
    expect(result!.transactions).toHaveLength(1);
    expect(result!.transactions[0].transaction_type).toBe('check_out');
    expect(result!.transactions[0].actual_return_date).toBeNull();
  });

  it('should identify current user for booked equipment', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment with booked status
    const equipmentResults = await db.insert(equipmentTable)
      .values({ ...testEquipment, status: 'booked' })
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create booking transaction
    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'booking',
      user_name: 'Bob Wilson',
      user_contact: 'bob@example.com',
      expected_return_date: new Date('2024-12-25'),
    }).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.equipment.status).toBe('booked');
    expect(result!.current_user).toBe('Bob Wilson');
    expect(result!.transactions).toHaveLength(1);
    expect(result!.transactions[0].transaction_type).toBe('booking');
    expect(result!.transactions[0].actual_return_date).toBeNull();
  });

  it('should not identify current user for available equipment even with past transactions', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment (available status)
    const equipmentResults = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create completed check-out/in cycle
    const checkOutDate = new Date('2024-01-01');
    const checkInDate = new Date('2024-01-03');

    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out',
      user_name: 'Alice Brown',
      user_contact: 'alice@example.com',
      transaction_date: checkOutDate,
      expected_return_date: new Date('2024-01-05'),
    }).execute();

    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_in',
      user_name: 'Alice Brown',
      user_contact: 'alice@example.com',
      transaction_date: checkInDate,
      actual_return_date: checkInDate,
    }).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.equipment.status).toBe('available');
    expect(result!.current_user).toBeNull();
    expect(result!.transactions).toHaveLength(2);
  });

  it('should handle equipment with mixed transaction types', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment
    const equipmentResults = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create various transaction types
    const dates = {
      booking: new Date('2024-01-01'),
      checkOut: new Date('2024-01-02'),
      checkIn: new Date('2024-01-03'),
    };

    await db.insert(equipmentTransactionsTable).values([
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'booking',
        user_name: 'User A',
        user_contact: 'usera@example.com',
        transaction_date: dates.booking,
        expected_return_date: new Date('2024-01-10'),
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_out',
        user_name: 'User B',
        user_contact: 'userb@example.com',
        transaction_date: dates.checkOut,
        expected_return_date: new Date('2024-01-15'),
      },
      {
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_in',
        user_name: 'User B',
        user_contact: 'userb@example.com',
        transaction_date: dates.checkIn,
        actual_return_date: dates.checkIn,
      },
    ]).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.transactions).toHaveLength(3);
    
    // Verify all transaction fields are properly populated
    result!.transactions.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.equipment_id).toBe(equipment.id);
      expect(transaction.admin_id).toBe(admin.id);
      expect(transaction.transaction_type).toMatch(/^(booking|check_out|check_in)$/);
      expect(transaction.user_name).toMatch(/^User [AB]$/);
      expect(transaction.transaction_date).toBeInstanceOf(Date);
      expect(transaction.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle equipment with nullable fields', async () => {
    // Create admin
    const adminResults = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    
    const admin = adminResults[0];

    // Create equipment with minimal data (nullable fields as null)
    const minimalEquipment = {
      name: 'Basic Equipment',
      serial_number: 'MIN001',
      description: null,
      category: 'Basic',
      brand: null,
      model: null,
      status: 'available' as const,
    };

    const equipmentResults = await db.insert(equipmentTable)
      .values(minimalEquipment)
      .returning()
      .execute();
    
    const equipment = equipmentResults[0];

    // Create transaction with nullable fields as null
    await db.insert(equipmentTransactionsTable).values({
      equipment_id: equipment.id,
      admin_id: admin.id,
      transaction_type: 'check_out',
      user_name: 'Test User',
      user_contact: null,
      notes: null,
      expected_return_date: null,
    }).execute();

    const result = await getEquipmentWithTransactions(equipment.id);

    expect(result).not.toBeNull();
    expect(result!.equipment.description).toBeNull();
    expect(result!.equipment.brand).toBeNull();
    expect(result!.equipment.model).toBeNull();
    expect(result!.transactions).toHaveLength(1);
    expect(result!.transactions[0].user_contact).toBeNull();
    expect(result!.transactions[0].notes).toBeNull();
    expect(result!.transactions[0].expected_return_date).toBeNull();
  });
});