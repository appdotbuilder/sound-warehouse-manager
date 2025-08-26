import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable, adminsTable, equipmentTransactionsTable } from '../db/schema';
import { deleteEquipment } from '../handlers/delete_equipment';
import { eq } from 'drizzle-orm';

describe('deleteEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete equipment successfully', async () => {
    // Create test equipment
    const equipment = await db.insert(equipmentTable)
      .values({
        name: 'Test Camera',
        serial_number: 'CAM001',
        description: 'A test camera',
        category: 'cameras',
        brand: 'Canon',
        model: 'EOS R5',
        status: 'available'
      })
      .returning()
      .execute();

    const equipmentId = equipment[0].id;

    // Delete the equipment
    const result = await deleteEquipment(equipmentId);

    expect(result).toBe(true);

    // Verify equipment is deleted from database
    const deletedEquipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    expect(deletedEquipment).toHaveLength(0);
  });

  it('should return false for non-existent equipment', async () => {
    const result = await deleteEquipment(99999);
    expect(result).toBe(false);
  });

  it('should prevent deletion of equipment with active transactions', async () => {
    // Create admin first
    const admin = await db.insert(adminsTable)
      .values({
        username: 'testadmin',
        email: 'admin@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test equipment
    const equipment = await db.insert(equipmentTable)
      .values({
        name: 'Test Laptop',
        serial_number: 'LAP001',
        description: 'A test laptop',
        category: 'laptops',
        brand: 'Dell',
        model: 'XPS 13',
        status: 'checked_out'
      })
      .returning()
      .execute();

    // Create active transaction (no actual_return_date)
    await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: equipment[0].id,
        admin_id: admin[0].id,
        transaction_type: 'check_out',
        user_name: 'John Doe',
        user_contact: 'john@example.com',
        notes: 'Test checkout'
      })
      .execute();

    // Try to delete equipment - should throw error
    await expect(deleteEquipment(equipment[0].id))
      .rejects
      .toThrow(/cannot delete equipment with active transactions/i);

    // Verify equipment still exists
    const stillExists = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment[0].id))
      .execute();

    expect(stillExists).toHaveLength(1);
  });

  it('should allow deletion of equipment with completed transactions', async () => {
    // Create admin first
    const admin = await db.insert(adminsTable)
      .values({
        username: 'testadmin2',
        email: 'admin2@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test equipment
    const equipment = await db.insert(equipmentTable)
      .values({
        name: 'Test Projector',
        serial_number: 'PROJ001',
        description: 'A test projector',
        category: 'projectors',
        brand: 'Epson',
        model: 'PowerLite',
        status: 'available'
      })
      .returning()
      .execute();

    // Create completed transaction (has actual_return_date)
    await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: equipment[0].id,
        admin_id: admin[0].id,
        transaction_type: 'check_out',
        user_name: 'Jane Smith',
        user_contact: 'jane@example.com',
        notes: 'Completed checkout',
        actual_return_date: new Date()
      })
      .execute();

    // Delete should succeed
    const result = await deleteEquipment(equipment[0].id);

    expect(result).toBe(true);

    // Verify equipment is deleted
    const deletedEquipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment[0].id))
      .execute();

    expect(deletedEquipment).toHaveLength(0);
  });

  it('should prevent deletion of equipment with booking transactions', async () => {
    // Create admin first
    const admin = await db.insert(adminsTable)
      .values({
        username: 'testadmin3',
        email: 'admin3@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test equipment
    const equipment = await db.insert(equipmentTable)
      .values({
        name: 'Test Microphone',
        serial_number: 'MIC001',
        description: 'A test microphone',
        category: 'audio',
        brand: 'Shure',
        model: 'SM58',
        status: 'booked'
      })
      .returning()
      .execute();

    // Create booking transaction (no actual_return_date)
    await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: equipment[0].id,
        admin_id: admin[0].id,
        transaction_type: 'booking',
        user_name: 'Bob Johnson',
        user_contact: 'bob@example.com',
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Future booking'
      })
      .execute();

    // Try to delete equipment - should throw error
    await expect(deleteEquipment(equipment[0].id))
      .rejects
      .toThrow(/cannot delete equipment with active transactions/i);

    // Verify equipment still exists
    const stillExists = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment[0].id))
      .execute();

    expect(stillExists).toHaveLength(1);
  });

  it('should handle equipment with multiple completed transactions', async () => {
    // Create admin first
    const admin = await db.insert(adminsTable)
      .values({
        username: 'testadmin4',
        email: 'admin4@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test equipment
    const equipment = await db.insert(equipmentTable)
      .values({
        name: 'Test Tablet',
        serial_number: 'TAB001',
        description: 'A test tablet',
        category: 'tablets',
        brand: 'iPad',
        model: 'Pro',
        status: 'available'
      })
      .returning()
      .execute();

    // Create multiple completed transactions
    await db.insert(equipmentTransactionsTable)
      .values([
        {
          equipment_id: equipment[0].id,
          admin_id: admin[0].id,
          transaction_type: 'check_out',
          user_name: 'User One',
          user_contact: 'user1@example.com',
          actual_return_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        },
        {
          equipment_id: equipment[0].id,
          admin_id: admin[0].id,
          transaction_type: 'check_out',
          user_name: 'User Two',
          user_contact: 'user2@example.com',
          actual_return_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ])
      .execute();

    // Delete should succeed even with multiple completed transactions
    const result = await deleteEquipment(equipment[0].id);

    expect(result).toBe(true);

    // Verify equipment is deleted
    const deletedEquipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment[0].id))
      .execute();

    expect(deletedEquipment).toHaveLength(0);
  });
});