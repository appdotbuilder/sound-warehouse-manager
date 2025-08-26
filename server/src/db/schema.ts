import { serial, text, pgTable, timestamp, integer, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Equipment status enum
export const equipmentStatusEnum = pgEnum('equipment_status', ['available', 'checked_out', 'booked', 'maintenance']);

// Transaction type enum
export const transactionTypeEnum = pgEnum('transaction_type', ['check_out', 'check_in', 'booking']);

// Admins table
export const adminsTable = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Equipment table
export const equipmentTable = pgTable('equipment', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  serial_number: text('serial_number').notNull().unique(),
  description: text('description'), // Nullable by default
  category: text('category').notNull(),
  brand: text('brand'), // Nullable by default
  model: text('model'), // Nullable by default
  status: equipmentStatusEnum('status').notNull().default('available'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Equipment transactions table
export const equipmentTransactionsTable = pgTable('equipment_transactions', {
  id: serial('id').primaryKey(),
  equipment_id: integer('equipment_id').notNull().references(() => equipmentTable.id),
  admin_id: integer('admin_id').notNull().references(() => adminsTable.id),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  user_name: text('user_name').notNull(), // Person who took/booked the equipment
  user_contact: text('user_contact'), // Contact info for the person (nullable)
  notes: text('notes'), // Additional notes (nullable)
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  expected_return_date: timestamp('expected_return_date'), // For bookings and check-outs (nullable)
  actual_return_date: timestamp('actual_return_date'), // When actually returned (nullable)
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relationships
export const adminsRelations = relations(adminsTable, ({ many }) => ({
  transactions: many(equipmentTransactionsTable),
}));

export const equipmentRelations = relations(equipmentTable, ({ many }) => ({
  transactions: many(equipmentTransactionsTable),
}));

export const equipmentTransactionsRelations = relations(equipmentTransactionsTable, ({ one }) => ({
  equipment: one(equipmentTable, {
    fields: [equipmentTransactionsTable.equipment_id],
    references: [equipmentTable.id],
  }),
  admin: one(adminsTable, {
    fields: [equipmentTransactionsTable.admin_id],
    references: [adminsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Admin = typeof adminsTable.$inferSelect;
export type NewAdmin = typeof adminsTable.$inferInsert;

export type Equipment = typeof equipmentTable.$inferSelect;
export type NewEquipment = typeof equipmentTable.$inferInsert;

export type EquipmentTransaction = typeof equipmentTransactionsTable.$inferSelect;
export type NewEquipmentTransaction = typeof equipmentTransactionsTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  admins: adminsTable,
  equipment: equipmentTable,
  equipmentTransactions: equipmentTransactionsTable,
};