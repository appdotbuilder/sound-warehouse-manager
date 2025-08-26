import { db } from '../db';
import { equipmentTable, equipmentTransactionsTable, adminsTable } from '../db/schema';
import { type EquipmentWithTransactions } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getEquipmentWithTransactions(equipmentId: number): Promise<EquipmentWithTransactions | null> {
  try {
    // First, get the equipment details
    const equipmentResults = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, equipmentId))
      .execute();

    if (equipmentResults.length === 0) {
      return null;
    }

    const equipment = equipmentResults[0];

    // Get all transactions for this equipment with admin details
    const transactionResults = await db
      .select({
        id: equipmentTransactionsTable.id,
        equipment_id: equipmentTransactionsTable.equipment_id,
        admin_id: equipmentTransactionsTable.admin_id,
        transaction_type: equipmentTransactionsTable.transaction_type,
        user_name: equipmentTransactionsTable.user_name,
        user_contact: equipmentTransactionsTable.user_contact,
        notes: equipmentTransactionsTable.notes,
        transaction_date: equipmentTransactionsTable.transaction_date,
        expected_return_date: equipmentTransactionsTable.expected_return_date,
        actual_return_date: equipmentTransactionsTable.actual_return_date,
        created_at: equipmentTransactionsTable.created_at,
      })
      .from(equipmentTransactionsTable)
      .innerJoin(adminsTable, eq(equipmentTransactionsTable.admin_id, adminsTable.id))
      .where(eq(equipmentTransactionsTable.equipment_id, equipmentId))
      .orderBy(desc(equipmentTransactionsTable.transaction_date))
      .execute();

    // Determine the current user based on the most recent transaction
    let current_user: string | null = null;
    
    if (transactionResults.length > 0 && equipment.status === 'checked_out') {
      // Find the most recent check-out transaction that hasn't been returned
      const mostRecentCheckOut = transactionResults.find(
        tx => tx.transaction_type === 'check_out' && tx.actual_return_date === null
      );
      
      if (mostRecentCheckOut) {
        current_user = mostRecentCheckOut.user_name;
      }
    } else if (transactionResults.length > 0 && equipment.status === 'booked') {
      // Find the most recent booking that hasn't been fulfilled or returned
      const mostRecentBooking = transactionResults.find(
        tx => tx.transaction_type === 'booking' && tx.actual_return_date === null
      );
      
      if (mostRecentBooking) {
        current_user = mostRecentBooking.user_name;
      }
    }

    return {
      equipment,
      transactions: transactionResults,
      current_user,
    };
  } catch (error) {
    console.error('Failed to get equipment with transactions:', error);
    throw error;
  }
}