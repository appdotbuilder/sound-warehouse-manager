import { db } from '../db';
import { equipmentTable } from '../db/schema';
import { type UpdateEquipmentInput, type Equipment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateEquipment = async (input: UpdateEquipmentInput): Promise<Equipment | null> => {
  try {
    const { id, ...updateData } = input;

    // First check if equipment exists
    const existing = await db.select()
      .from(equipmentTable)
      .where(eq(equipmentTable.id, id))
      .execute();

    if (existing.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateValues: any = {};
    
    if (updateData.name !== undefined) {
      updateValues.name = updateData.name;
    }
    if (updateData.serial_number !== undefined) {
      updateValues.serial_number = updateData.serial_number;
    }
    if (updateData.description !== undefined) {
      updateValues.description = updateData.description;
    }
    if (updateData.category !== undefined) {
      updateValues.category = updateData.category;
    }
    if (updateData.brand !== undefined) {
      updateValues.brand = updateData.brand;
    }
    if (updateData.model !== undefined) {
      updateValues.model = updateData.model;
    }
    if (updateData.status !== undefined) {
      updateValues.status = updateData.status;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // If no fields to update, return the existing record
    if (Object.keys(updateValues).length === 1) { // Only updated_at
      return existing[0];
    }

    // Update the equipment record
    const result = await db.update(equipmentTable)
      .set(updateValues)
      .where(eq(equipmentTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Equipment update failed:', error);
    throw error;
  }
};