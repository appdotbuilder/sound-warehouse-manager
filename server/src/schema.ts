import { z } from 'zod';

// Admin user schema
export const adminSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Admin = z.infer<typeof adminSchema>;

// Input schema for creating admin users
export const createAdminInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6), // Raw password for hashing
});

export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;

// Input schema for admin login
export const loginAdminInputSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type LoginAdminInput = z.infer<typeof loginAdminInputSchema>;

// Equipment status enum
export const equipmentStatusSchema = z.enum(['available', 'checked_out', 'booked', 'maintenance']);

export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;

// Equipment schema
export const equipmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  serial_number: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  status: equipmentStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Equipment = z.infer<typeof equipmentSchema>;

// Input schema for creating equipment
export const createEquipmentInputSchema = z.object({
  name: z.string().min(1),
  serial_number: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  status: equipmentStatusSchema.default('available'),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentInputSchema>;

// Input schema for updating equipment
export const updateEquipmentInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  serial_number: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  status: equipmentStatusSchema.optional(),
});

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentInputSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['check_out', 'check_in', 'booking']);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Equipment transaction schema
export const equipmentTransactionSchema = z.object({
  id: z.number(),
  equipment_id: z.number(),
  admin_id: z.number(),
  transaction_type: transactionTypeSchema,
  user_name: z.string(), // Person who took/booked the equipment
  user_contact: z.string().nullable(), // Contact info for the person
  notes: z.string().nullable(),
  transaction_date: z.coerce.date(),
  expected_return_date: z.coerce.date().nullable(), // For bookings and check-outs
  actual_return_date: z.coerce.date().nullable(), // When actually returned
  created_at: z.coerce.date(),
});

export type EquipmentTransaction = z.infer<typeof equipmentTransactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  equipment_id: z.number(),
  admin_id: z.number(),
  transaction_type: transactionTypeSchema,
  user_name: z.string().min(1),
  user_contact: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  expected_return_date: z.coerce.date().nullable().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Input schema for checking in equipment
export const checkInEquipmentInputSchema = z.object({
  equipment_id: z.number(),
  admin_id: z.number(),
  notes: z.string().nullable().optional(),
});

export type CheckInEquipmentInput = z.infer<typeof checkInEquipmentInputSchema>;

// Input schema for checking out equipment
export const checkOutEquipmentInputSchema = z.object({
  equipment_id: z.number(),
  admin_id: z.number(),
  user_name: z.string().min(1),
  user_contact: z.string().nullable().optional(),
  expected_return_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CheckOutEquipmentInput = z.infer<typeof checkOutEquipmentInputSchema>;

// Input schema for booking equipment
export const bookEquipmentInputSchema = z.object({
  equipment_id: z.number(),
  admin_id: z.number(),
  user_name: z.string().min(1),
  user_contact: z.string().nullable().optional(),
  expected_return_date: z.coerce.date(),
  notes: z.string().nullable().optional(),
});

export type BookEquipmentInput = z.infer<typeof bookEquipmentInputSchema>;

// Equipment with transaction details (for detailed views)
export const equipmentWithTransactionsSchema = z.object({
  equipment: equipmentSchema,
  transactions: z.array(equipmentTransactionSchema),
  current_user: z.string().nullable(), // Current user who has the equipment
});

export type EquipmentWithTransactions = z.infer<typeof equipmentWithTransactionsSchema>;

// Query parameters
export const getEquipmentQuerySchema = z.object({
  status: equipmentStatusSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(), // Search by name, serial number, or description
});

export type GetEquipmentQuery = z.infer<typeof getEquipmentQuerySchema>;

export const getTransactionsQuerySchema = z.object({
  equipment_id: z.number().optional(),
  admin_id: z.number().optional(),
  transaction_type: transactionTypeSchema.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;