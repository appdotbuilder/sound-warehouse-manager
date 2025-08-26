import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Equipment } from '../schema';

export async function getEquipmentBySerial(serialNumber: string): Promise<Equipment | null> {
  try {
    const results = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.serial_number, serialNumber))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Return the first result (should be unique due to database constraint)
    const equipment = results[0];
    return {
      ...equipment,
      created_at: equipment.created_at,
      updated_at: equipment.updated_at,
    };
  } catch (error) {
    console.error('Get equipment by serial failed:', error);
    throw error;
  }
}