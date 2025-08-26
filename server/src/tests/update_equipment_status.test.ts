import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type EquipmentStatus } from '../schema';
import { updateEquipmentStatus } from '../handlers/update_equipment_status';
import { eq } from 'drizzle-orm';

// Test equipment data
const testEquipment = {
  name: 'Test Camera',
  serial_number: 'CAM123',
  description: 'Professional camera for testing',
  category: 'Video',
  brand: 'Canon',
  model: 'EOS R5',
  status: 'available' as EquipmentStatus,
};

describe('updateEquipmentStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update equipment status successfully', async () => {
    // Create test equipment
    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Update status to maintenance
    const result = await updateEquipmentStatus(equipment.id, 'maintenance');

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(equipment.id);
    expect(result!.name).toEqual('Test Camera');
    expect(result!.status).toEqual('maintenance');
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(equipment.updated_at.getTime());
  });

  it('should update status to different values', async () => {
    // Create test equipment
    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Test all possible status values
    const statuses: EquipmentStatus[] = ['checked_out', 'booked', 'maintenance', 'available'];

    for (const status of statuses) {
      const result = await updateEquipmentStatus(equipment.id, status);
      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
    }
  });

  it('should persist status update in database', async () => {
    // Create test equipment
    const [equipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Update status
    await updateEquipmentStatus(equipment.id, 'checked_out');

    // Query database directly to verify persistence
    const [updatedEquipment] = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipment.id))
      .execute();

    expect(updatedEquipment.status).toEqual('checked_out');
    expect(updatedEquipment.updated_at).toBeInstanceOf(Date);
    expect(updatedEquipment.updated_at.getTime()).toBeGreaterThan(equipment.updated_at.getTime());
  });

  it('should return null for non-existent equipment', async () => {
    // Try to update status for non-existent equipment
    const result = await updateEquipmentStatus(99999, 'maintenance');

    expect(result).toBeNull();
  });

  it('should handle equipment with minimal data', async () => {
    // Create equipment with minimal required fields
    const minimalEquipment = {
      name: 'Minimal Equipment',
      serial_number: 'MIN001',
      category: 'Other',
      status: 'available' as EquipmentStatus,
    };

    const [equipment] = await db.insert(equipmentTable)
      .values(minimalEquipment)
      .returning()
      .execute();

    // Update status
    const result = await updateEquipmentStatus(equipment.id, 'booked');

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('booked');
    expect(result!.name).toEqual('Minimal Equipment');
    expect(result!.description).toBeNull();
    expect(result!.brand).toBeNull();
    expect(result!.model).toBeNull();
  });

  it('should preserve all other equipment fields when updating status', async () => {
    // Create equipment with all fields populated
    const fullEquipment = {
      name: 'Full Spec Equipment',
      serial_number: 'FULL123',
      description: 'Equipment with all fields',
      category: 'Audio',
      brand: 'Sony',
      model: 'Professional',
      status: 'available' as EquipmentStatus,
    };

    const [equipment] = await db.insert(equipmentTable)
      .values(fullEquipment)
      .returning()
      .execute();

    // Update only the status
    const result = await updateEquipmentStatus(equipment.id, 'maintenance');

    expect(result).not.toBeNull();
    expect(result!.name).toEqual(fullEquipment.name);
    expect(result!.serial_number).toEqual(fullEquipment.serial_number);
    expect(result!.description).toEqual(fullEquipment.description);
    expect(result!.category).toEqual(fullEquipment.category);
    expect(result!.brand).toEqual(fullEquipment.brand);
    expect(result!.model).toEqual(fullEquipment.model);
    expect(result!.status).toEqual('maintenance');
    expect(result!.created_at).toEqual(equipment.created_at);
  });
});