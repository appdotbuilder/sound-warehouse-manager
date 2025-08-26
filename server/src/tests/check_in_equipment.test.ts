import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminsTable, equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { type CheckInEquipmentInput } from '../schema';
import { checkInEquipment } from '../handlers/check_in_equipment';
import { eq, and, isNull, desc } from 'drizzle-orm';
// Test data setup
const setupTestData = async () => {
  // Create test admin
  const adminResult = await db.insert(adminsTable)
    .values({
      username: 'testadmin',
      email: 'admin@test.com',
      password_hash: 'hashedpassword123',
    })
    .returning()
    .execute();

  // Create test equipment in checked_out status
  const equipmentResult = await db.insert(equipmentTable)
    .values({
      name: 'Test Equipment',
      serial_number: 'TEST001',
      description: 'Equipment for testing check-in',
      category: 'Test Category',
      brand: 'Test Brand',
      model: 'Test Model',
      status: 'checked_out',
    })
    .returning()
    .execute();

  // Create initial check_out transaction
  const transactionResult = await db.insert(equipmentTransactionsTable)
    .values({
      equipment_id: equipmentResult[0].id,
      admin_id: adminResult[0].id,
      transaction_type: 'check_out',
      user_name: 'John Doe',
      user_contact: 'john@example.com',
      notes: 'Initial checkout for testing',
      expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    })
    .returning()
    .execute();

  return {
    admin: adminResult[0],
    equipment: equipmentResult[0],
    checkOutTransaction: transactionResult[0],
  };
};

const testInput: CheckInEquipmentInput = {
  equipment_id: 1, // Will be updated with actual ID
  admin_id: 1, // Will be updated with actual ID
  notes: 'Equipment returned in good condition',
};

describe('checkInEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully check in equipment that is checked out', async () => {
    const { admin, equipment, checkOutTransaction } = await setupTestData();
    
    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    const result = await checkInEquipment(input);

    // Verify check-in transaction fields
    expect(result.equipment_id).toEqual(equipment.id);
    expect(result.admin_id).toEqual(admin.id);
    expect(result.transaction_type).toEqual('check_in');
    expect(result.user_name).toEqual('System');
    expect(result.user_contact).toBeNull();
    expect(result.notes).toEqual('Equipment returned in good condition');
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.expected_return_date).toBeNull();
    expect(result.actual_return_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update equipment status to available', async () => {
    const { admin, equipment } = await setupTestData();
    
    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    await checkInEquipment(input);

    // Verify equipment status was updated
    const updatedEquipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    expect(updatedEquipment[0].status).toEqual('available');
    expect(updatedEquipment[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the corresponding check-out transaction with actual return date', async () => {
    const { admin, equipment, checkOutTransaction } = await setupTestData();
    
    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    await checkInEquipment(input);

    // Verify the original check-out transaction was updated
    const updatedTransaction = await db.select()
      .from(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.id, checkOutTransaction.id))
      .execute();

    expect(updatedTransaction[0].actual_return_date).toBeInstanceOf(Date);
    expect(updatedTransaction[0].actual_return_date).not.toBeNull();
  });

  it('should work with booked equipment', async () => {
    const { admin, equipment } = await setupTestData();
    
    // Update equipment to booked status
    await db.update(equipmentTable)
      .set({ status: 'booked' })
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    const result = await checkInEquipment(input);

    expect(result.transaction_type).toEqual('check_in');
    
    // Verify equipment status was updated to available
    const updatedEquipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    expect(updatedEquipment[0].status).toEqual('available');
  });

  it('should handle check-in with null notes', async () => {
    const { admin, equipment } = await setupTestData();
    
    const input = {
      equipment_id: equipment.id,
      admin_id: admin.id,
      notes: null,
    };

    const result = await checkInEquipment(input);

    expect(result.notes).toBeNull();
  });

  it('should throw error when equipment does not exist', async () => {
    const { admin } = await setupTestData();
    
    const input = {
      ...testInput,
      equipment_id: 99999, // Non-existent equipment ID
      admin_id: admin.id,
    };

    expect(checkInEquipment(input)).rejects.toThrow(/equipment.*not found/i);
  });

  it('should throw error when equipment is already available', async () => {
    const { admin, equipment } = await setupTestData();
    
    // Update equipment to available status
    await db.update(equipmentTable)
      .set({ status: 'available' })
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    expect(checkInEquipment(input)).rejects.toThrow(/currently available.*cannot check in/i);
  });

  it('should throw error when equipment is in maintenance', async () => {
    const { admin, equipment } = await setupTestData();
    
    // Update equipment to maintenance status
    await db.update(equipmentTable)
      .set({ status: 'maintenance' })
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    expect(checkInEquipment(input)).rejects.toThrow(/currently maintenance.*cannot check in/i);
  });

  it('should save check-in transaction to database', async () => {
    const { admin, equipment } = await setupTestData();
    
    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    const result = await checkInEquipment(input);

    // Verify transaction was saved to database
    const savedTransaction = await db.select()
      .from(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.id, result.id))
      .execute();

    expect(savedTransaction).toHaveLength(1);
    expect(savedTransaction[0].transaction_type).toEqual('check_in');
    expect(savedTransaction[0].equipment_id).toEqual(equipment.id);
    expect(savedTransaction[0].admin_id).toEqual(admin.id);
    expect(savedTransaction[0].user_name).toEqual('System');
  });

  it('should handle multiple transactions correctly', async () => {
    const { admin, equipment, checkOutTransaction } = await setupTestData();
    
    // Create another check-out transaction (simulate re-checking out the same equipment)
    await db.update(equipmentTable)
      .set({ status: 'available' })
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    await db.update(equipmentTransactionsTable)
      .set({ actual_return_date: new Date() })
      .where(eq(equipmentTransactionsTable.id, checkOutTransaction.id))
      .execute();

    await db.update(equipmentTable)
      .set({ status: 'checked_out' })
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    const secondCheckOut = await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: equipment.id,
        admin_id: admin.id,
        transaction_type: 'check_out',
        user_name: 'Jane Smith',
        user_contact: 'jane@example.com',
        notes: 'Second checkout',
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      equipment_id: equipment.id,
      admin_id: admin.id,
    };

    await checkInEquipment(input);

    // Verify only the most recent transaction was updated
    const updatedSecondTransaction = await db.select()
      .from(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.id, secondCheckOut[0].id))
      .execute();

    expect(updatedSecondTransaction[0].actual_return_date).toBeInstanceOf(Date);
    expect(updatedSecondTransaction[0].actual_return_date).not.toBeNull();
  });
});