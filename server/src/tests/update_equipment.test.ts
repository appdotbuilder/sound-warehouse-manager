import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable, adminsTable } from '../db/schema';
import { type UpdateEquipmentInput } from '../schema';
import { updateEquipment } from '../handlers/update_equipment';
import { eq } from 'drizzle-orm';

describe('updateEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let existingEquipment: any;
  let admin: any;

  beforeEach(async () => {
    // Create admin user
    const adminResult = await db.insert(adminsTable)
      .values({
        username: 'testadmin',
        email: 'admin@test.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    admin = adminResult[0];

    // Create initial equipment
    const equipmentResult = await db.insert(equipmentTable)
      .values({
        name: 'Original Equipment',
        serial_number: 'ORIG123',
        description: 'Original description',
        category: 'Audio',
        brand: 'Original Brand',
        model: 'Original Model',
        status: 'available'
      })
      .returning()
      .execute();
    existingEquipment = equipmentResult[0];
  });

  it('should update equipment with all fields', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      name: 'Updated Equipment',
      serial_number: 'UPD456',
      description: 'Updated description',
      category: 'Video',
      brand: 'Updated Brand',
      model: 'Updated Model',
      status: 'maintenance'
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(existingEquipment.id);
    expect(result!.name).toEqual('Updated Equipment');
    expect(result!.serial_number).toEqual('UPD456');
    expect(result!.description).toEqual('Updated description');
    expect(result!.category).toEqual('Video');
    expect(result!.brand).toEqual('Updated Brand');
    expect(result!.model).toEqual('Updated Model');
    expect(result!.status).toEqual('maintenance');
    expect(result!.created_at).toEqual(existingEquipment.created_at);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > existingEquipment.updated_at).toBe(true);
  });

  it('should update equipment with partial fields', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      name: 'Partially Updated',
      status: 'checked_out'
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Partially Updated');
    expect(result!.status).toEqual('checked_out');
    // Other fields should remain unchanged
    expect(result!.serial_number).toEqual('ORIG123');
    expect(result!.description).toEqual('Original description');
    expect(result!.category).toEqual('Audio');
    expect(result!.brand).toEqual('Original Brand');
    expect(result!.model).toEqual('Original Model');
  });

  it('should update equipment with nullable fields set to null', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      description: null,
      brand: null,
      model: null
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeDefined();
    expect(result!.description).toBeNull();
    expect(result!.brand).toBeNull();
    expect(result!.model).toBeNull();
    // Other fields should remain unchanged
    expect(result!.name).toEqual('Original Equipment');
    expect(result!.serial_number).toEqual('ORIG123');
    expect(result!.category).toEqual('Audio');
  });

  it('should save updated equipment to database', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      name: 'Database Updated Equipment',
      status: 'booked'
    };

    await updateEquipment(updateInput);

    // Verify changes were saved to database
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, existingEquipment.id))
      .execute();

    expect(equipment).toHaveLength(1);
    expect(equipment[0].name).toEqual('Database Updated Equipment');
    expect(equipment[0].status).toEqual('booked');
    expect(equipment[0].updated_at).toBeInstanceOf(Date);
    expect(equipment[0].updated_at > existingEquipment.updated_at).toBe(true);
  });

  it('should return null when equipment does not exist', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: 99999, // Non-existent ID
      name: 'Updated Equipment'
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeNull();
  });

  it('should return original equipment when no update fields provided', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id
      // No update fields provided
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Original Equipment');
    expect(result!.serial_number).toEqual('ORIG123');
    expect(result!.status).toEqual('available');
    // Should still have the same timestamps since no real update occurred
    expect(result!.created_at).toEqual(existingEquipment.created_at);
  });

  it('should handle serial number uniqueness constraint', async () => {
    // Create another equipment with a different serial number
    const anotherEquipment = await db.insert(equipmentTable)
      .values({
        name: 'Another Equipment',
        serial_number: 'ANOTHER456',
        category: 'Lighting',
        status: 'available'
      })
      .returning()
      .execute();

    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      serial_number: 'ANOTHER456' // Try to use existing serial number
    };

    // Should throw error due to unique constraint violation
    await expect(updateEquipment(updateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should update equipment status correctly', async () => {
    const updateInput: UpdateEquipmentInput = {
      id: existingEquipment.id,
      status: 'maintenance'
    };

    const result = await updateEquipment(updateInput);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('maintenance');

    // Verify all possible status values can be set
    const statuses: Array<'available' | 'checked_out' | 'booked' | 'maintenance'> = 
      ['available', 'checked_out', 'booked', 'maintenance'];

    for (const status of statuses) {
      const statusUpdateInput: UpdateEquipmentInput = {
        id: existingEquipment.id,
        status: status
      };

      const statusResult = await updateEquipment(statusUpdateInput);
      expect(statusResult!.status).toEqual(status);
    }
  });
});