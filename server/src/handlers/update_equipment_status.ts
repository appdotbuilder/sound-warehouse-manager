import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type Equipment, type EquipmentStatus } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateEquipmentStatus(equipmentId: number, status: EquipmentStatus): Promise<Equipment | null> {
  try {
    // Update the equipment status and updated_at timestamp
    const result = await db.update(equipmentTable)
      .set({ 
        status: status,
        updated_at: new Date()
      })
      .where(eq(equipmentTable.id, equipmentId))
      .returning()
      .execute();

    // Return null if equipment doesn't exist
    if (result.length === 0) {
      return null;
    }

    // Return the updated equipment
    return result[0];
  } catch (error) {
    console.error('Equipment status update failed:', error);
    throw error;
  }
}