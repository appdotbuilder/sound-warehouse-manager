import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable, equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { type CheckOutEquipmentInput } from '../schema';
import { checkOutEquipment } from '../handlers/check_out_equipment';
import { eq } from 'drizzle-orm';

// Test data
const testAdmin = {
  username: 'test_admin',
  email: 'admin@test.com',
  password_hash: 'hashed_password_123'
};

const testEquipment = {
  name: 'Test Camera',
  serial_number: 'CAM123456',
  description: 'Professional DSLR camera',
  category: 'Photography',
  brand: 'Canon',
  model: 'EOS R5',
  status: 'available' as const
};

const testInput: CheckOutEquipmentInput = {
  equipment_id: 1, // Will be set after equipment creation
  admin_id: 1, // Will be set after admin creation
  user_name: 'John Doe',
  user_contact: 'john.doe@email.com',
  expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  notes: 'Equipment checked out for photography project'
};

describe('checkOutEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminId: number;
  let equipmentId: number;

  beforeEach(async () => {
    // Create test admin
    const adminResult = await db.insert(adminsTable)
      .values(testAdmin)
      .returning()
      .execute();
    adminId = adminResult[0].id;

    // Create test equipment
    const equipmentResult = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();
    equipmentId = equipmentResult[0].id;

    // Update test input with created IDs
    testInput.admin_id = adminId;
    testInput.equipment_id = equipmentId;
  });

  it('should check out available equipment successfully', async () => {
    const result = await checkOutEquipment(testInput);

    // Verify transaction record
    expect(result.equipment_id).toEqual(equipmentId);
    expect(result.admin_id).toEqual(adminId);
    expect(result.transaction_type).toEqual('check_out');
    expect(result.user_name).toEqual('John Doe');
    expect(result.user_contact).toEqual('john.doe@email.com');
    expect(result.notes).toEqual('Equipment checked out for photography project');
    expect(result.expected_return_date).toBeInstanceOf(Date);
    expect(result.actual_return_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update equipment status to checked_out', async () => {
    await checkOutEquipment(testInput);

    // Verify equipment status was updated
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    expect(equipment).toHaveLength(1);
    expect(equipment[0].status).toEqual('checked_out');
    expect(equipment[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const result = await checkOutEquipment(testInput);

    // Verify transaction was saved
    const transactions = await db.select()
      .from(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].equipment_id).toEqual(equipmentId);
    expect(transactions[0].admin_id).toEqual(adminId);
    expect(transactions[0].transaction_type).toEqual('check_out');
    expect(transactions[0].user_name).toEqual('John Doe');
  });

  it('should handle optional fields correctly', async () => {
    const minimalInput: CheckOutEquipmentInput = {
      equipment_id: equipmentId,
      admin_id: adminId,
      user_name: 'Jane Smith'
    };

    const result = await checkOutEquipment(minimalInput);

    expect(result.user_name).toEqual('Jane Smith');
    expect(result.user_contact).toBeNull();
    expect(result.expected_return_date).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('should throw error when equipment does not exist', async () => {
    const invalidInput: CheckOutEquipmentInput = {
      ...testInput,
      equipment_id: 99999 // Non-existent equipment
    };

    expect(checkOutEquipment(invalidInput)).rejects.toThrow(/Equipment with id 99999 not found/i);
  });

  it('should throw error when admin does not exist', async () => {
    const invalidInput: CheckOutEquipmentInput = {
      ...testInput,
      admin_id: 99999 // Non-existent admin
    };

    expect(checkOutEquipment(invalidInput)).rejects.toThrow(/Admin with id 99999 not found/i);
  });

  it('should throw error when equipment is not available', async () => {
    // Update equipment status to checked_out
    await db.update(equipmentTable)
      .set({ status: 'checked_out' })
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    expect(checkOutEquipment(testInput)).rejects.toThrow(/Equipment is not available.*checked_out/i);
  });

  it('should throw error when equipment is in maintenance', async () => {
    // Update equipment status to maintenance
    await db.update(equipmentTable)
      .set({ status: 'maintenance' })
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    expect(checkOutEquipment(testInput)).rejects.toThrow(/Equipment is not available.*maintenance/i);
  });

  it('should throw error when equipment is booked', async () => {
    // Update equipment status to booked
    await db.update(equipmentTable)
      .set({ status: 'booked' })
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    expect(checkOutEquipment(testInput)).rejects.toThrow(/Equipment is not available.*booked/i);
  });

  it('should handle future expected return date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14); // 14 days from now

    const inputWithFutureDate: CheckOutEquipmentInput = {
      ...testInput,
      expected_return_date: futureDate
    };

    const result = await checkOutEquipment(inputWithFutureDate);

    expect(result.expected_return_date).toBeInstanceOf(Date);
    expect(result.expected_return_date?.getTime()).toEqual(futureDate.getTime());
  });
});