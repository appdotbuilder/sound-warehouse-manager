import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { sql } from 'drizzle-orm';

export const getEquipmentCategories = async (): Promise<string[]> => {
  try {
    // Query to get distinct categories from equipment table
    const results = await db
      .select({
        category: equipmentTable.category
      })
      .from(equipmentTable)
      .groupBy(equipmentTable.category)
      .orderBy(equipmentTable.category)
      .execute();

    // Extract category strings from the results
    return results.map(result => result.category);
  } catch (error) {
    console.error('Failed to fetch equipment categories:', error);
    throw error;
  }
};