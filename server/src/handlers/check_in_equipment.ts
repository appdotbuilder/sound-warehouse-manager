import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable } from '../db/schema';
import { type CheckInEquipmentInput, type EquipmentTransaction } from '../schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function checkInEquipment(input: CheckInEquipmentInput): Promise<EquipmentTransaction> {
  try {
    // 1. Verify equipment exists and is currently checked_out or booked
    const equipment = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    if (equipment.length === 0) {
      throw new Error(`Equipment with ID ${input.equipment_id} not found`);
    }

    const currentEquipment = equipment[0];
    if (currentEquipment.status !== 'checked_out' && currentEquipment.status !== 'booked') {
      throw new Error(`Equipment is currently ${currentEquipment.status}, cannot check in`);
    }

    // 2. Update equipment status to 'available'
    await db.update(equipmentTable)
      .set({ 
        status: 'available',
        updated_at: new Date()
      })
      .where(eq(equipmentTable.id, input.equipment_id))
      .execute();

    // 3. Find the most recent check_out or booking transaction to update
    const lastTransaction = await db.select()
      .from(equipmentTransactionsTable)
      .where(
        and(
          eq(equipmentTransactionsTable.equipment_id, input.equipment_id),
          isNull(equipmentTransactionsTable.actual_return_date)
        )
      )
      .orderBy(desc(equipmentTransactionsTable.created_at))
      .limit(1)
      .execute();

    // 4. Update the corresponding check_out/booking transaction's actual_return_date
    if (lastTransaction.length > 0) {
      await db.update(equipmentTransactionsTable)
        .set({ 
          actual_return_date: new Date()
        })
        .where(eq(equipmentTransactionsTable.id, lastTransaction[0].id))
        .execute();
    }

    // 5. Create a transaction record with type 'check_in'
    const checkInTransactionResult = await db.insert(equipmentTransactionsTable)
      .values({
        equipment_id: input.equipment_id,
        admin_id: input.admin_id,
        transaction_type: 'check_in',
        user_name: 'System', // Check-ins are done by admins, not users
        user_contact: null,
        notes: input.notes || null,
        transaction_date: new Date(),
        expected_return_date: null,
        actual_return_date: new Date(), // For check-ins, actual return is immediate
      })
      .returning()
      .execute();

    return checkInTransactionResult[0];
  } catch (error) {
    console.error('Equipment check-in failed:', error);
    throw error;
  }
}