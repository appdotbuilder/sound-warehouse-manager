import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type Equipment, type GetEquipmentQuery } from '../schema';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getEquipment(query?: GetEquipmentQuery): Promise<Equipment[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.status) {
      conditions.push(eq(equipmentTable.status, query.status));
    }

    if (query?.category) {
      conditions.push(eq(equipmentTable.category, query.category));
    }

    if (query?.search) {
      // Search across name, serial_number, and description fields
      const searchTerm = `%${query.search}%`;
      conditions.push(
        or(
          ilike(equipmentTable.name, searchTerm),
          ilike(equipmentTable.serial_number, searchTerm),
          ilike(equipmentTable.description, searchTerm)
        )!
      );
    }

    // Build and execute query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(equipmentTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions)!)
          .execute()
      : await db.select()
          .from(equipmentTable)
          .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Equipment fetch failed:', error);
    throw error;
  }
}