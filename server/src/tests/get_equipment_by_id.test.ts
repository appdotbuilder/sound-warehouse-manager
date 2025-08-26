import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable, adminsTable } from '../db/schema';
import { getEquipmentById } from '../handlers/get_equipment_by_id';
import { eq } from 'drizzle-orm';

// Test data
const testAdmin = {
  username: 'testadmin',
  email: 'admin@test.com',
  password_hash: 'hashed_password'
};

const testEquipment = {
  name: 'Test Camera',
  serial_number: 'CAM001',
  description: 'Professional DSLR camera for testing',
  category: 'Photography',
  brand: 'Canon',
  model: 'EOS R5',
  status: 'available' as const
};

const testEquipmentMinimal = {
  name: 'Minimal Equipment',
  serial_number: 'MIN001',
  description: null,
  category: 'Tools',
  brand: null,
  model: null,
  status: 'maintenance' as const
};

describe('getEquipmentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return equipment when found', async () => {
    // Create test admin first
    await db.insert(adminsTable).values(testAdmin).execute();

    // Create test equipment
    const [createdEquipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    const result = await getEquipmentById(createdEquipment.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdEquipment.id);
    expect(result!.name).toEqual('Test Camera');
    expect(result!.serial_number).toEqual('CAM001');
    expect(result!.description).toEqual('Professional DSLR camera for testing');
    expect(result!.category).toEqual('Photography');
    expect(result!.brand).toEqual('Canon');
    expect(result!.model).toEqual('EOS R5');
    expect(result!.status).toEqual('available');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when equipment not found', async () => {
    const result = await getEquipmentById(999999);
    expect(result).toBeNull();
  });

  it('should handle equipment with null fields correctly', async () => {
    // Create test admin first
    await db.insert(adminsTable).values(testAdmin).execute();

    // Create minimal equipment with null fields
    const [createdEquipment] = await db.insert(equipmentTable)
      .values(testEquipmentMinimal)
      .returning()
      .execute();

    const result = await getEquipmentById(createdEquipment.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdEquipment.id);
    expect(result!.name).toEqual('Minimal Equipment');
    expect(result!.serial_number).toEqual('MIN001');
    expect(result!.description).toBeNull();
    expect(result!.category).toEqual('Tools');
    expect(result!.brand).toBeNull();
    expect(result!.model).toBeNull();
    expect(result!.status).toEqual('maintenance');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct equipment by specific ID', async () => {
    // Create test admin first
    await db.insert(adminsTable).values(testAdmin).execute();

    // Create multiple equipment items
    const [equipment1] = await db.insert(equipmentTable)
      .values({
        ...testEquipment,
        name: 'Equipment 1',
        serial_number: 'EQ001'
      })
      .returning()
      .execute();

    const [equipment2] = await db.insert(equipmentTable)
      .values({
        ...testEquipment,
        name: 'Equipment 2',
        serial_number: 'EQ002',
        status: 'checked_out' as const
      })
      .returning()
      .execute();

    // Get specific equipment
    const result = await getEquipmentById(equipment2.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(equipment2.id);
    expect(result!.name).toEqual('Equipment 2');
    expect(result!.serial_number).toEqual('EQ002');
    expect(result!.status).toEqual('checked_out');
    
    // Ensure it's not the other equipment
    expect(result!.id).not.toEqual(equipment1.id);
    expect(result!.name).not.toEqual('Equipment 1');
  });

  it('should handle different equipment statuses correctly', async () => {
    // Create test admin first
    await db.insert(adminsTable).values(testAdmin).execute();

    // Test each status
    const statuses = ['available', 'checked_out', 'booked', 'maintenance'] as const;
    
    for (const status of statuses) {
      const [createdEquipment] = await db.insert(equipmentTable)
        .values({
          ...testEquipment,
          serial_number: `TEST_${status.toUpperCase()}`,
          status
        })
        .returning()
        .execute();

      const result = await getEquipmentById(createdEquipment.id);
      
      expect(result).toBeDefined();
      expect(result!.status).toEqual(status);
    }
  });

  it('should verify database consistency', async () => {
    // Create test admin first
    await db.insert(adminsTable).values(testAdmin).execute();

    // Create equipment
    const [createdEquipment] = await db.insert(equipmentTable)
      .values(testEquipment)
      .returning()
      .execute();

    // Get equipment through handler
    const handlerResult = await getEquipmentById(createdEquipment.id);

    // Get equipment directly from database
    const [dbResult] = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, createdEquipment.id))
      .execute();

    expect(handlerResult).toBeDefined();
    expect(handlerResult!.id).toEqual(dbResult.id);
    expect(handlerResult!.name).toEqual(dbResult.name);
    expect(handlerResult!.serial_number).toEqual(dbResult.serial_number);
    expect(handlerResult!.status).toEqual(dbResult.status);
    expect(handlerResult!.created_at.getTime()).toEqual(dbResult.created_at.getTime());
    expect(handlerResult!.updated_at.getTime()).toEqual(dbResult.updated_at.getTime());
  });
});