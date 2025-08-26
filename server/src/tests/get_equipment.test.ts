import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type GetEquipmentQuery } from '../schema';
import { getEquipment } from '../handlers/get_equipment';

describe('getEquipment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test equipment for various scenarios
  const createTestEquipment = async () => {
    return await db.insert(equipmentTable).values([
      {
        name: 'Camera Canon EOS R5',
        serial_number: 'CAM001',
        description: 'Professional mirrorless camera',
        category: 'Camera',
        brand: 'Canon',
        model: 'EOS R5',
        status: 'available',
      },
      {
        name: 'Lens 24-70mm f/2.8',
        serial_number: 'LENS001',
        description: 'Professional zoom lens',
        category: 'Lens',
        brand: 'Canon',
        model: '24-70mm f/2.8L',
        status: 'checked_out',
      },
      {
        name: 'Tripod Manfrotto',
        serial_number: 'TRP001',
        description: 'Carbon fiber tripod',
        category: 'Tripod',
        brand: 'Manfrotto',
        model: 'MT055CXPRO4',
        status: 'booked',
      },
      {
        name: 'Microphone Rode VideoMic',
        serial_number: 'MIC001',
        description: 'Shotgun microphone',
        category: 'Audio',
        brand: 'Rode',
        model: 'VideoMic Pro',
        status: 'maintenance',
      },
      {
        name: 'Camera Sony A7III',
        serial_number: 'CAM002',
        description: null, // Test nullable description
        category: 'Camera',
        brand: 'Sony',
        model: 'A7III',
        status: 'available',
      }
    ]).returning().execute();
  };

  it('should return all equipment when no query is provided', async () => {
    await createTestEquipment();

    const result = await getEquipment();

    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('serial_number');
    expect(result[0]).toHaveProperty('status');
    expect(result[0]).toHaveProperty('created_at');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return all equipment when empty query is provided', async () => {
    await createTestEquipment();

    const result = await getEquipment({});

    expect(result).toHaveLength(5);
  });

  it('should filter equipment by status', async () => {
    await createTestEquipment();

    const availableResult = await getEquipment({ status: 'available' });
    expect(availableResult).toHaveLength(2);
    availableResult.forEach(equipment => {
      expect(equipment.status).toBe('available');
    });

    const checkedOutResult = await getEquipment({ status: 'checked_out' });
    expect(checkedOutResult).toHaveLength(1);
    expect(checkedOutResult[0].status).toBe('checked_out');
    expect(checkedOutResult[0].name).toBe('Lens 24-70mm f/2.8');

    const bookedResult = await getEquipment({ status: 'booked' });
    expect(bookedResult).toHaveLength(1);
    expect(bookedResult[0].status).toBe('booked');

    const maintenanceResult = await getEquipment({ status: 'maintenance' });
    expect(maintenanceResult).toHaveLength(1);
    expect(maintenanceResult[0].status).toBe('maintenance');
  });

  it('should filter equipment by category', async () => {
    await createTestEquipment();

    const cameraResult = await getEquipment({ category: 'Camera' });
    expect(cameraResult).toHaveLength(2);
    cameraResult.forEach(equipment => {
      expect(equipment.category).toBe('Camera');
    });

    const lensResult = await getEquipment({ category: 'Lens' });
    expect(lensResult).toHaveLength(1);
    expect(lensResult[0].category).toBe('Lens');

    const tripodResult = await getEquipment({ category: 'Tripod' });
    expect(tripodResult).toHaveLength(1);
    expect(tripodResult[0].category).toBe('Tripod');

    const audioResult = await getEquipment({ category: 'Audio' });
    expect(audioResult).toHaveLength(1);
    expect(audioResult[0].category).toBe('Audio');
  });

  it('should search equipment by name (case insensitive)', async () => {
    await createTestEquipment();

    const cameraSearch = await getEquipment({ search: 'camera' });
    expect(cameraSearch).toHaveLength(2);
    cameraSearch.forEach(equipment => {
      expect(equipment.name.toLowerCase()).toContain('camera');
    });

    const canonSearch = await getEquipment({ search: 'Canon' });
    expect(canonSearch).toHaveLength(1);
    expect(canonSearch[0].name).toBe('Camera Canon EOS R5');

    const sonySearch = await getEquipment({ search: 'SONY' });
    expect(sonySearch).toHaveLength(1);
    expect(sonySearch[0].name).toBe('Camera Sony A7III');
  });

  it('should search equipment by serial number (case insensitive)', async () => {
    await createTestEquipment();

    const serialSearch = await getEquipment({ search: 'cam001' });
    expect(serialSearch).toHaveLength(1);
    expect(serialSearch[0].serial_number).toBe('CAM001');

    const lensSerial = await getEquipment({ search: 'LENS001' });
    expect(lensSerial).toHaveLength(1);
    expect(lensSerial[0].serial_number).toBe('LENS001');
  });

  it('should search equipment by description (case insensitive)', async () => {
    await createTestEquipment();

    const professionalSearch = await getEquipment({ search: 'professional' });
    expect(professionalSearch).toHaveLength(2);
    professionalSearch.forEach(equipment => {
      expect(equipment.description?.toLowerCase()).toContain('professional');
    });

    const carbonSearch = await getEquipment({ search: 'CARBON' });
    expect(carbonSearch).toHaveLength(1);
    expect(carbonSearch[0].description?.toLowerCase()).toContain('carbon');

    const shotgunSearch = await getEquipment({ search: 'shotgun' });
    expect(shotgunSearch).toHaveLength(1);
    expect(shotgunSearch[0].description?.toLowerCase()).toContain('shotgun');
  });

  it('should combine status and category filters', async () => {
    await createTestEquipment();

    const availableCameraResult = await getEquipment({ 
      status: 'available', 
      category: 'Camera' 
    });
    expect(availableCameraResult).toHaveLength(2);
    availableCameraResult.forEach(equipment => {
      expect(equipment.status).toBe('available');
      expect(equipment.category).toBe('Camera');
    });

    const checkedOutLensResult = await getEquipment({ 
      status: 'checked_out', 
      category: 'Lens' 
    });
    expect(checkedOutLensResult).toHaveLength(1);
    expect(checkedOutLensResult[0].status).toBe('checked_out');
    expect(checkedOutLensResult[0].category).toBe('Lens');
  });

  it('should combine status and search filters', async () => {
    await createTestEquipment();

    const availableCameraSearch = await getEquipment({ 
      status: 'available', 
      search: 'camera' 
    });
    expect(availableCameraSearch).toHaveLength(2);
    availableCameraSearch.forEach(equipment => {
      expect(equipment.status).toBe('available');
      expect(equipment.name.toLowerCase()).toContain('camera');
    });

    const maintenanceMicSearch = await getEquipment({ 
      status: 'maintenance', 
      search: 'microphone' 
    });
    expect(maintenanceMicSearch).toHaveLength(1);
    expect(maintenanceMicSearch[0].status).toBe('maintenance');
    expect(maintenanceMicSearch[0].name.toLowerCase()).toContain('microphone');
  });

  it('should combine category and search filters', async () => {
    await createTestEquipment();

    const cameraSonySearch = await getEquipment({ 
      category: 'Camera', 
      search: 'sony' 
    });
    expect(cameraSonySearch).toHaveLength(1);
    expect(cameraSonySearch[0].category).toBe('Camera');
    expect(cameraSonySearch[0].name.toLowerCase()).toContain('sony');

    const lensProfessionalSearch = await getEquipment({ 
      category: 'Lens', 
      search: 'professional' 
    });
    expect(lensProfessionalSearch).toHaveLength(1);
    expect(lensProfessionalSearch[0].category).toBe('Lens');
    expect(lensProfessionalSearch[0].description?.toLowerCase()).toContain('professional');
  });

  it('should combine all filters', async () => {
    await createTestEquipment();

    const allFiltersResult = await getEquipment({ 
      status: 'available', 
      category: 'Camera',
      search: 'Canon'
    });
    expect(allFiltersResult).toHaveLength(1);
    expect(allFiltersResult[0].status).toBe('available');
    expect(allFiltersResult[0].category).toBe('Camera');
    expect(allFiltersResult[0].name).toContain('Canon');

    // Test combination that should return no results
    const noResultsQuery = await getEquipment({ 
      status: 'checked_out', 
      category: 'Camera',
      search: 'Canon'
    });
    expect(noResultsQuery).toHaveLength(0);
  });

  it('should return empty array when no equipment matches filters', async () => {
    await createTestEquipment();

    const noMatchStatus = await getEquipment({ status: 'available', category: 'NonExistent' });
    expect(noMatchStatus).toHaveLength(0);

    const noMatchSearch = await getEquipment({ search: 'NonExistentEquipment' });
    expect(noMatchSearch).toHaveLength(0);
  });

  it('should return empty array when database is empty', async () => {
    const result = await getEquipment();
    expect(result).toHaveLength(0);

    const resultWithFilters = await getEquipment({ status: 'available', search: 'test' });
    expect(resultWithFilters).toHaveLength(0);
  });

  it('should handle null description in search correctly', async () => {
    await createTestEquipment();

    // Search should not crash when description is null
    const searchResult = await getEquipment({ search: 'A7III' });
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].description).toBeNull();
    expect(searchResult[0].name).toBe('Camera Sony A7III');
  });

  it('should preserve all equipment fields in results', async () => {
    const testEquipment = await createTestEquipment();

    const result = await getEquipment();
    
    // Verify all fields are present and correct types
    result.forEach(equipment => {
      expect(typeof equipment.id).toBe('number');
      expect(typeof equipment.name).toBe('string');
      expect(typeof equipment.serial_number).toBe('string');
      expect(equipment.description === null || typeof equipment.description === 'string').toBe(true);
      expect(typeof equipment.category).toBe('string');
      expect(equipment.brand === null || typeof equipment.brand === 'string').toBe(true);
      expect(equipment.model === null || typeof equipment.model === 'string').toBe(true);
      expect(['available', 'checked_out', 'booked', 'maintenance']).toContain(equipment.status);
      expect(equipment.created_at).toBeInstanceOf(Date);
      expect(equipment.updated_at).toBeInstanceOf(Date);
    });
  });
});