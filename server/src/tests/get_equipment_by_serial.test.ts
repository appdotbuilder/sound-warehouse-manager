import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { getEquipmentBySerial } from '../handlers/get_equipment_by_serial';

describe('getEquipmentBySerial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return equipment by serial number', async () => {
    // Create test equipment
    const testEquipment = {
      name: 'Test Laptop',
      serial_number: 'SN123456789',
      description: 'A test laptop for development',
      category: 'Computers',
      brand: 'TestBrand',
      model: 'TestModel',
      status: 'available' as const,
    };

    const insertResult = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    const createdEquipment = insertResult[0];

    // Test the handler
    const result = await getEquipmentBySerial('SN123456789');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdEquipment.id);
    expect(result!.name).toEqual('Test Laptop');
    expect(result!.serial_number).toEqual('SN123456789');
    expect(result!.description).toEqual('A test laptop for development');
    expect(result!.category).toEqual('Computers');
    expect(result!.brand).toEqual('TestBrand');
    expect(result!.model).toEqual('TestModel');
    expect(result!.status).toEqual('available');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent serial number', async () => {
    const result = await getEquipmentBySerial('NONEXISTENT123');
    expect(result).toBeNull();
  });

  it('should handle empty database', async () => {
    const result = await getEquipmentBySerial('SN123456789');
    expect(result).toBeNull();
  });

  it('should be case sensitive for serial numbers', async () => {
    // Create test equipment
    const testEquipment = {
      name: 'Test Equipment',
      serial_number: 'SN123abc',
      description: 'Case sensitive test',
      category: 'Electronics',
      brand: null,
      model: null,
      status: 'available' as const,
    };

    await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Test exact match
    const exactResult = await getEquipmentBySerial('SN123abc');
    expect(exactResult).not.toBeNull();
    expect(exactResult!.serial_number).toEqual('SN123abc');

    // Test case mismatch
    const uppercaseResult = await getEquipmentBySerial('SN123ABC');
    expect(uppercaseResult).toBeNull();

    const lowercaseResult = await getEquipmentBySerial('sn123abc');
    expect(lowercaseResult).toBeNull();
  });

  it('should handle equipment with null optional fields', async () => {
    // Create test equipment with minimal required fields
    const testEquipment = {
      name: 'Minimal Equipment',
      serial_number: 'MIN123',
      description: null,
      category: 'Other',
      brand: null,
      model: null,
      status: 'maintenance' as const,
    };

    await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    const result = await getEquipmentBySerial('MIN123');

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Equipment');
    expect(result!.serial_number).toEqual('MIN123');
    expect(result!.description).toBeNull();
    expect(result!.brand).toBeNull();
    expect(result!.model).toBeNull();
    expect(result!.status).toEqual('maintenance');
  });

  it('should handle different equipment statuses', async () => {
    const statuses = ['available', 'checked_out', 'booked', 'maintenance'] as const;
    
    // Create equipment with different statuses
    for (let i = 0; i < statuses.length; i++) {
      const testEquipment = {
        name: `Equipment ${i + 1}`,
        serial_number: `STATUS${i + 1}`,
        description: `Equipment with ${statuses[i]} status`,
        category: 'Test',
        brand: 'TestBrand',
        model: 'TestModel',
        status: statuses[i],
      };

      await db.insert(equipmentTable)
        .values(testEquipment)
        .returning()
        .execute();
    }

    // Test retrieval of each status
    for (let i = 0; i < statuses.length; i++) {
      const result = await getEquipmentBySerial(`STATUS${i + 1}`);
      expect(result).not.toBeNull();
      expect(result!.status).toEqual(statuses[i]);
      expect(result!.name).toEqual(`Equipment ${i + 1}`);
    }
  });

  it('should handle special characters in serial numbers', async () => {
    const specialSerials = [
      'SN-123-456',
      'SN_789_012',
      'SN.345.678',
      'SN@901#234',
      'SN 456 789', // with spaces
    ];

    // Create equipment with special character serial numbers
    for (let i = 0; i < specialSerials.length; i++) {
      const testEquipment = {
        name: `Special Equipment ${i + 1}`,
        serial_number: specialSerials[i],
        description: 'Equipment with special characters',
        category: 'Special',
        brand: null,
        model: null,
        status: 'available' as const,
      };

      await db.insert(equipmentTable)
        .values(testEquipment)
        .returning()
        .execute();
    }

    // Test retrieval with special characters
    for (let i = 0; i < specialSerials.length; i++) {
      const result = await getEquipmentBySerial(specialSerials[i]);
      expect(result).not.toBeNull();
      expect(result!.serial_number).toEqual(specialSerials[i]);
      expect(result!.name).toEqual(`Special Equipment ${i + 1}`);
    }
  });
});