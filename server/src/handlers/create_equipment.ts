import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type CreateEquipmentInput, type Equipment } from '../schema';

export const createEquipment = async (input: CreateEquipmentInput): Promise<Equipment> => {
  try {
    // Insert equipment record
    const result = await db.insert(equipmentTable)
      .values({
        name: input.name,
        serial_number: input.serial_number,
        description: input.description || null,
        category: input.category,
        brand: input.brand || null,
        model: input.model || null,
        status: input.status || 'available'
      })
      .returning()
      .execute();

    const equipment = result[0];
    return equipment;
  } catch (error) {
    console.error('Equipment creation failed:', error);
    throw error;
  }
};