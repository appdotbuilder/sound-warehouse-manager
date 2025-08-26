import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type Equipment } from '../schema';
import { eq } from 'drizzle-orm';

export const getEquipmentById = async (id: number): Promise<Equipment | null> => {
  try {
    const results = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const equipment = results[0];
    return {
      ...equipment,
      // All fields are already correctly typed - no numeric conversions needed
      // as equipment table doesn't have numeric columns that need conversion
    };
  } catch (error) {
    console.error('Failed to fetch equipment by ID:', error);
    throw error;
  }
};