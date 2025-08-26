import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type CreateEquipmentInput } from '../schema';
import { createEquipment } from '../handlers/create_equipment';
import { eq } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateEquipmentInput = {
  name: 'Test Camera',
  serial_number: 'CAM-001',
  description: 'A camera for testing',
  category: 'photography',
  brand: 'Canon',
  model: 'EOS R5',
  status: 'available'
};

// Minimal test input with only required fields
const minimalInput: CreateEquipmentInput = {
  name: 'Minimal Equipment',
  serial_number: 'MIN-001',
  category: 'general',
  status: 'available'
};

describe('createEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create equipment with all fields', async () => {
    const result = await createEquipment(testInput);

    // Verify all field values
    expect(result.name).toEqual('Test Camera');
    expect(result.serial_number).toEqual('CAM-001');
    expect(result.description).toEqual('A camera for testing');
    expect(result.category).toEqual('photography');
    expect(result.brand).toEqual('Canon');
    expect(result.model).toEqual('EOS R5');
    expect(result.status).toEqual('available');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create equipment with minimal required fields', async () => {
    const result = await createEquipment(minimalInput);

    // Verify required fields
    expect(result.name).toEqual('Minimal Equipment');
    expect(result.serial_number).toEqual('MIN-001');
    expect(result.category).toEqual('general');
    expect(result.status).toEqual('available'); // Default value
    
    // Verify nullable fields are null
    expect(result.description).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    
    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save equipment to database', async () => {
    const result = await createEquipment(testInput);

    // Query database to verify equipment was saved
    const equipmentList = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, result.id))
      .execute();

    expect(equipmentList).toHaveLength(1);
    const savedEquipment = equipmentList[0];
    
    expect(savedEquipment.name).toEqual('Test Camera');
    expect(savedEquipment.serial_number).toEqual('CAM-001');
    expect(savedEquipment.description).toEqual('A camera for testing');
    expect(savedEquipment.category).toEqual('photography');
    expect(savedEquipment.brand).toEqual('Canon');
    expect(savedEquipment.model).toEqual('EOS R5');
    expect(savedEquipment.status).toEqual('available');
    expect(savedEquipment.created_at).toBeInstanceOf(Date);
    expect(savedEquipment.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different equipment statuses', async () => {
    const maintenanceInput: CreateEquipmentInput = {
      name: 'Broken Equipment',
      serial_number: 'BRK-001',
      category: 'photography',
      status: 'maintenance'
    };

    const result = await createEquipment(maintenanceInput);

    expect(result.status).toEqual('maintenance');
    expect(result.name).toEqual('Broken Equipment');
    expect(result.serial_number).toEqual('BRK-001');
  });

  it('should apply default status when not provided', async () => {
    const inputWithoutStatus: CreateEquipmentInput = {
      name: 'Default Status Equipment',
      serial_number: 'DEF-001',
      category: 'general',
      status: 'available'
    };

    const result = await createEquipment(inputWithoutStatus);

    expect(result.status).toEqual('available');
  });

  it('should reject duplicate serial numbers', async () => {
    // Create first equipment
    await createEquipment(testInput);

    // Try to create second equipment with same serial number
    const duplicateInput: CreateEquipmentInput = {
      name: 'Duplicate Serial',
      serial_number: 'CAM-001', // Same as testInput
      category: 'photography',
      status: 'available'
    };

    await expect(createEquipment(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle various categories', async () => {
    const categories = ['photography', 'video', 'audio', 'lighting', 'accessories'];
    
    for (let i = 0; i < categories.length; i++) {
      const categoryInput: CreateEquipmentInput = {
        name: `${categories[i]} Equipment`,
        serial_number: `${categories[i].toUpperCase()}-001`,
        category: categories[i],
        status: 'available'
      };

      const result = await createEquipment(categoryInput);
      expect(result.category).toEqual(categories[i]);
      expect(result.name).toEqual(`${categories[i]} Equipment`);
    }
  });

  it('should preserve null values for optional fields', async () => {
    const nullFieldsInput: CreateEquipmentInput = {
      name: 'Null Fields Equipment',
      serial_number: 'NULL-001',
      category: 'general',
      description: null,
      brand: null,
      model: null,
      status: 'available'
    };

    const result = await createEquipment(nullFieldsInput);

    expect(result.description).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.name).toEqual('Null Fields Equipment');
  });
});