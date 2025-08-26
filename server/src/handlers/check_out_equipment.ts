import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable, adminsTable } from '../db/schema';
import { type CheckOutEquipmentInput, type EquipmentTransaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const checkOutEquipment = async (input: CheckOutEquipmentInput): Promise<EquipmentTransaction> => {
  try {
    // 1. Verify admin exists
    const admin = await db.select()
      .from(adminsTable)
      .where(eq(adminsTable.id, input.admin_id))
      .execute();

    if (admin.length === 0) {
      throw new Error(`Admin with id ${input.admin_id} not found`);
    }

    // 2. Verify equipment exists and is available
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    if (equipment.length === 0) {
      throw new Error(`Equipment with id ${input.equipment_id} not found`);
    }

    if (equipment[0].status !== 'available') {
      throw new Error(`Equipment is not available (current status: ${equipment[0].status})`);
    }

    // 3. Update equipment status to 'checked_out'
    await db.update(equipmentTable)
      .set({ 
        status: 'checked_out',
        updated_at: new Date()
      })
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    // 4. Create a transaction record with type 'check_out'
    const result = await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: input.equipment_id,
        admin_id: input.admin_id,
        transaction_type: 'check_out',
        user_name: input.user_name,
        user_contact: input.user_contact || null,
        notes: input.notes || null,
        expected_return_date: input.expected_return_date || null,
        actual_return_date: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Equipment check-out failed:', error);
    throw error;
  }
};