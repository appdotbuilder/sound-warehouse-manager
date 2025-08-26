import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable, adminsTable } from '../db/schema';
import { type BookEquipmentInput, type EquipmentTransaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function bookEquipment(input: BookEquipmentInput): Promise<EquipmentTransaction> {
  try {
    // Verify admin exists
    const admin = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, input.admin_id))
      .execute();

    if (admin.length === 0) {
      throw new Error(`Admin with id ${input.admin_id} not found`);
    }

    // Verify equipment exists and is available
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    if (equipment.length === 0) {
      throw new Error(`Equipment with id ${input.equipment_id} not found`);
    }

    if (equipment[0].status !== 'available') {
      throw new Error(`Equipment is not available for booking. Current status: ${equipment[0].status}`);
    }

    // Update equipment status to 'booked'
    await db.update(equipmentTable)
      .set({ 
        status: 'booked',
        updated_at: new Date()
      })
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    // Create transaction record
    const result = await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: input.equipment_id,
        admin_id: input.admin_id,
        transaction_type: 'booking',
        user_name: input.user_name,
        user_contact: input.user_contact || null,
        notes: input.notes || null,
        expected_return_date: input.expected_return_date,
        actual_return_date: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Equipment booking failed:', error);
    throw error;
  }
}