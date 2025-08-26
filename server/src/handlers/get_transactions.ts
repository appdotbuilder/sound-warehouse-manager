import { db } from '../db';
import { equipmentTransactionsTable, equipmentTable, adminsTable } from '../db/schema';
import { type EquipmentTransaction, type GetTransactionsQuery } from '../schema';
import { eq, and, gte, lte, desc, type SQL } from 'drizzle-orm';

export async function getTransactions(query?: GetTransactionsQuery): Promise<EquipmentTransaction[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.equipment_id !== undefined) {
      conditions.push(eq(equipmentTransactionsTable.equipment_id, query.equipment_id));
    }

    if (query?.admin_id !== undefined) {
      conditions.push(eq(equipmentTransactionsTable.admin_id, query.admin_id));
    }

    if (query?.transaction_type) {
      conditions.push(eq(equipmentTransactionsTable.transaction_type, query.transaction_type));
    }

    if (query?.start_date) {
      conditions.push(gte(equipmentTransactionsTable.transaction_date, query.start_date));
    }

    if (query?.end_date) {
      conditions.push(lte(equipmentTransactionsTable.transaction_date, query.end_date));
    }

    // Build query in single chain to maintain proper types
    const baseQuery = db.select().from(equipmentTransactionsTable);

    // Execute query with or without where clause
    const results = conditions.length > 0 
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(equipmentTransactionsTable.transaction_date))
          .execute()
      : await baseQuery
          .orderBy(desc(equipmentTransactionsTable.transaction_date))
          .execute();

    // Return the results directly as they match the EquipmentTransaction type
    return results;
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
}