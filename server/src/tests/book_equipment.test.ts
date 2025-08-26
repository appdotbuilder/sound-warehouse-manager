import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable, adminsTable } from '../db/schema';
import { type BookEquipmentInput } from '../schema';
import { bookEquipment } from '../handlers/book_equipment';
import { eq } from 'drizzle-orm';

describe('bookEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testAdminId: number;
  let testEquipmentId: number;

  beforeEach(async () => {
    // Create test admin
    const adminResult = await db.insert(adminsTable)
      .values({
        username: 'testadmin',
        email: 'admin@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    testAdminId = adminResult[0].id;

    // Create test equipment
    const equipmentResult = await db.insert(equipmentTable)
      .values({
        name: 'Test Camera',
        serial_number: 'CAM001',
        description: 'Professional camera for testing',
        category: 'Photography',
        brand: 'Canon',
        model: 'EOS R5',
        status: 'available'
      })
      .returning()
      .execute();
    testEquipmentId = equipmentResult[0].id;
  });

  const testInput: BookEquipmentInput = {
    equipment_id: 1, // Will be overridden in tests
    admin_id: 1, // Will be overridden in tests
    user_name: 'John Doe',
    user_contact: 'john@example.com',
    expected_return_date: new Date('2024-12-31'),
    notes: 'Booking for project X'
  };

  it('should book available equipment successfully', async () => {
    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId
    };

    const result = await bookEquipment(input);

    // Verify transaction record
    expect(result.equipment_id).toEqual(testEquipmentId);
    expect(result.admin_id).toEqual(testAdminId);
    expect(result.transaction_type).toEqual('booking');
    expect(result.user_name).toEqual('John Doe');
    expect(result.user_contact).toEqual('john@example.com');
    expect(result.notes).toEqual('Booking for project X');
    expect(result.expected_return_date).toEqual(new Date('2024-12-31'));
    expect(result.actual_return_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update equipment status to booked', async () => {
    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId
    };

    await bookEquipment(input);

    // Verify equipment status was updated
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, testEquipmentId))
      .execute();

    expect(equipment[0].status).toEqual('booked');
    expect(equipment[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId
    };

    const result = await bookEquipment(input);

    // Query transaction from database
    const transactions = await db.select()
      .from(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].equipment_id).toEqual(testEquipmentId);
    expect(transactions[0].admin_id).toEqual(testAdminId);
    expect(transactions[0].transaction_type).toEqual('booking');
    expect(transactions[0].user_name).toEqual('John Doe');
    expect(transactions[0].user_contact).toEqual('john@example.com');
    expect(transactions[0].notes).toEqual('Booking for project X');
    expect(transactions[0].expected_return_date).toEqual(new Date('2024-12-31'));
    expect(transactions[0].actual_return_date).toBeNull();
  });

  it('should handle null optional fields correctly', async () => {
    const input = {
      equipment_id: testEquipmentId,
      admin_id: testAdminId,
      user_name: 'Jane Smith',
      user_contact: null,
      expected_return_date: new Date('2024-12-25'),
      notes: null
    };

    const result = await bookEquipment(input);

    expect(result.user_contact).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.user_name).toEqual('Jane Smith');
    expect(result.expected_return_date).toEqual(new Date('2024-12-25'));
  });

  it('should throw error when equipment does not exist', async () => {
    const input = {
      ...testInput,
      equipment_id: 99999, // Non-existent equipment
      admin_id: testAdminId
    };

    await expect(bookEquipment(input)).rejects.toThrow(/Equipment with id 99999 not found/i);
  });

  it('should throw error when admin does not exist', async () => {
    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: 99999 // Non-existent admin
    };

    await expect(bookEquipment(input)).rejects.toThrow(/Admin with id 99999 not found/i);
  });

  it('should throw error when equipment is not available', async () => {
    // Update equipment status to checked_out
    await db.update(equipmentTable)
      .set({ status: 'checked_out' })
      .where(eq(equipmentTable.id, testEquipmentId))
      .execute();

    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId
    };

    await expect(bookEquipment(input)).rejects.toThrow(/Equipment is not available for booking. Current status: checked_out/i);
  });

  it('should throw error when equipment is in maintenance', async () => {
    // Update equipment status to maintenance
    await db.update(equipmentTable)
      .set({ status: 'maintenance' })
      .where(eq(equipmentTable.id, testEquipmentId))
      .execute();

    const input = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId
    };

    await expect(bookEquipment(input)).rejects.toThrow(/Equipment is not available for booking. Current status: maintenance/i);
  });

  it('should throw error when equipment is already booked', async () => {
    // Book the equipment first
    const firstBooking = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId,
      user_name: 'First User'
    };

    await bookEquipment(firstBooking);

    // Try to book the same equipment again
    const secondBooking = {
      ...testInput,
      equipment_id: testEquipmentId,
      admin_id: testAdminId,
      user_name: 'Second User'
    };

    await expect(bookEquipment(secondBooking)).rejects.toThrow(/Equipment is not available for booking. Current status: booked/i);
  });

  it('should handle different equipment statuses correctly', async () => {
    const statuses = ['checked_out', 'booked', 'maintenance'] as const;

    for (const status of statuses) {
      // Reset equipment status
      await db.update(equipmentTable)
        .set({ status })
        .where(eq(equipmentTable.id, testEquipmentId))
        .execute();

      const input = {
        ...testInput,
        equipment_id: testEquipmentId,
        admin_id: testAdminId
      };

      await expect(bookEquipment(input)).rejects.toThrow(
        new RegExp(`Equipment is not available for booking. Current status: ${status}`, 'i')
      );
    }
  });
});