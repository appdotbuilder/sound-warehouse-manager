import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function deleteEquipment(id: number): Promise<boolean> {
  try {
    // First check if equipment exists
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, id))
      .execute();

    if (equipment.length === 0) {
      return false; // Equipment doesn't exist
    }

    // Check for active transactions (checked out or booked equipment without return)
    const activeTransactions = await db.select()
      .from(equipmentTransactionsTable)
      .where(
        and(
          eq(equipmentTransactionsTable.equipment_id, id),
          isNull(equipmentTransactionsTable.actual_return_date)
        )
      )
      .execute();

    // Prevent deletion if equipment has active transactions
    if (activeTransactions.length > 0) {
      throw new Error('Cannot delete equipment with active transactions. Please check in equipment first.');
    }

    // Delete all historical transactions first to avoid foreign key constraint
    await db.delete(equipmentTransactionsTable)
      .where(eq(equipmentTransactionsTable.equipment_id, id))
      .execute();

    // Delete the equipment
    await db.delete(equipmentTable)
      .where(eq(equipmentTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Equipment deletion failed:', error);
    throw error;
  }
}