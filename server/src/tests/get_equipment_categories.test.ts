import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { getEquipmentCategories } from '../handlers/get_equipment_categories';

describe('getEquipmentCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no equipment exists', async () => {
    const categories = await getEquipmentCategories();
    expect(categories).toEqual([]);
  });

  it('should return unique categories in alphabetical order', async () => {
    // Create equipment with different categories
    await db.insert(equipmentTable).values([
      {
        name: 'Wireless Microphone',
        serial_number: 'WM001',
        category: 'Audio',
      },
      {
        name: 'LED Light Panel',
        serial_number: 'LED001',
        category: 'Lighting',
      },
      {
        name: 'USB Microphone',
        serial_number: 'USB001',
        category: 'Audio',
      },
      {
        name: '4K Camera',
        serial_number: 'CAM001',
        category: 'Video',
      },
      {
        name: 'XLR Cable',
        serial_number: 'XLR001',
        category: 'Cables',
      }
    ]).execute();

    const categories = await getEquipmentCategories();

    // Should return unique categories in alphabetical order
    expect(categories).toEqual(['Audio', 'Cables', 'Lighting', 'Video']);
    expect(categories).toHaveLength(4);
  });

  it('should handle duplicate categories correctly', async () => {
    // Create multiple equipment items with same category
    await db.insert(equipmentTable).values([
      {
        name: 'Microphone 1',
        serial_number: 'MIC001',
        category: 'Audio',
      },
      {
        name: 'Microphone 2',
        serial_number: 'MIC002',
        category: 'Audio',
      },
      {
        name: 'Microphone 3',
        serial_number: 'MIC003',
        category: 'Audio',
      }
    ]).execute();

    const categories = await getEquipmentCategories();

    // Should return only one instance of 'Audio'
    expect(categories).toEqual(['Audio']);
    expect(categories).toHaveLength(1);
  });

  it('should return single category when only one exists', async () => {
    await db.insert(equipmentTable).values({
      name: 'Test Equipment',
      serial_number: 'TEST001',
      category: 'Testing',
    }).execute();

    const categories = await getEquipmentCategories();

    expect(categories).toEqual(['Testing']);
    expect(categories).toHaveLength(1);
  });

  it('should handle mixed case categories correctly', async () => {
    // Create equipment with categories that have different cases
    await db.insert(equipmentTable).values([
      {
        name: 'Equipment 1',
        serial_number: 'EQ001',
        category: 'audio',
      },
      {
        name: 'Equipment 2',
        serial_number: 'EQ002',
        category: 'Audio',
      },
      {
        name: 'Equipment 3',
        serial_number: 'EQ003',
        category: 'AUDIO',
      }
    ]).execute();

    const categories = await getEquipmentCategories();

    // Should preserve original case and treat as separate categories
    expect(categories).toEqual(['AUDIO', 'Audio', 'audio']);
    expect(categories).toHaveLength(3);
  });

  it('should maintain alphabetical order with many categories', async () => {
    // Create equipment with many different categories
    const testCategories = [
      'Zebra', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot',
      'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike'
    ];

    const equipmentData = testCategories.map((category, index) => ({
      name: `Equipment ${category}`,
      serial_number: `${category}${String(index).padStart(3, '0')}`,
      category: category,
    }));

    await db.insert(equipmentTable).values(equipmentData).execute();

    const categories = await getEquipmentCategories();

    // Should return all categories in alphabetical order
    const expectedOrder = [...testCategories].sort();
    expect(categories).toEqual(expectedOrder);
    expect(categories).toHaveLength(testCategories.length);
  });

  it('should persist data correctly in database', async () => {
    // Insert test data
    await db.insert(equipmentTable).values([
      {
        name: 'Test Equipment 1',
        serial_number: 'TEST001',
        category: 'Category A',
      },
      {
        name: 'Test Equipment 2', 
        serial_number: 'TEST002',
        category: 'Category B',
      }
    ]).execute();

    // Verify data exists in database
    const equipmentCount = await db.select().from(equipmentTable).execute();
    expect(equipmentCount).toHaveLength(2);

    // Verify categories are returned correctly
    const categories = await getEquipmentCategories();
    expect(categories).toEqual(['Category A', 'Category B']);
  });
});