import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createAdminInputSchema,
  loginAdminInputSchema,
  createEquipmentInputSchema,
  updateEquipmentInputSchema,
  getEquipmentQuerySchema,
  checkOutEquipmentInputSchema,
  checkInEquipmentInputSchema,
  bookEquipmentInputSchema,
  getTransactionsQuerySchema,
  equipmentStatusSchema
} from './schema';

// Import handlers
import { createAdmin } from './handlers/create_admin';
import { loginAdmin } from './handlers/login_admin';
import { getAdmins } from './handlers/get_admins';
import { createEquipment } from './handlers/create_equipment';
import { getEquipment } from './handlers/get_equipment';
import { getEquipmentById } from './handlers/get_equipment_by_id';
import { getEquipmentBySerial } from './handlers/get_equipment_by_serial';
import { updateEquipment } from './handlers/update_equipment';
import { deleteEquipment } from './handlers/delete_equipment';
import { checkOutEquipment } from './handlers/check_out_equipment';
import { checkInEquipment } from './handlers/check_in_equipment';
import { bookEquipment } from './handlers/book_equipment';
import { getTransactions } from './handlers/get_transactions';
import { getEquipmentWithTransactions } from './handlers/get_equipment_with_transactions';
import { getEquipmentCategories } from './handlers/get_equipment_categories';
import { updateEquipmentStatus } from './handlers/update_equipment_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Admin management routes
  createAdmin: publicProcedure
    .input(createAdminInputSchema)
    .mutation(({ input }) => createAdmin(input)),

  loginAdmin: publicProcedure
    .input(loginAdminInputSchema)
    .mutation(({ input }) => loginAdmin(input)),

  getAdmins: publicProcedure
    .query(() => getAdmins()),

  // Equipment management routes
  createEquipment: publicProcedure
    .input(createEquipmentInputSchema)
    .mutation(({ input }) => createEquipment(input)),

  getEquipment: publicProcedure
    .input(getEquipmentQuerySchema.optional())
    .query(({ input }) => getEquipment(input)),

  getEquipmentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getEquipmentById(input.id)),

  getEquipmentBySerial: publicProcedure
    .input(z.object({ serialNumber: z.string() }))
    .query(({ input }) => getEquipmentBySerial(input.serialNumber)),

  updateEquipment: publicProcedure
    .input(updateEquipmentInputSchema)
    .mutation(({ input }) => updateEquipment(input)),

  deleteEquipment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteEquipment(input.id)),

  // Equipment transaction routes
  checkOutEquipment: publicProcedure
    .input(checkOutEquipmentInputSchema)
    .mutation(({ input }) => checkOutEquipment(input)),

  checkInEquipment: publicProcedure
    .input(checkInEquipmentInputSchema)
    .mutation(({ input }) => checkInEquipment(input)),

  bookEquipment: publicProcedure
    .input(bookEquipmentInputSchema)
    .mutation(({ input }) => bookEquipment(input)),

  // Transaction and reporting routes
  getTransactions: publicProcedure
    .input(getTransactionsQuerySchema.optional())
    .query(({ input }) => getTransactions(input)),

  getEquipmentWithTransactions: publicProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(({ input }) => getEquipmentWithTransactions(input.equipmentId)),

  // Utility routes
  getEquipmentCategories: publicProcedure
    .query(() => getEquipmentCategories()),

  updateEquipmentStatus: publicProcedure
    .input(z.object({ 
      equipmentId: z.number(), 
      status: equipmentStatusSchema 
    }))
    .mutation(({ input }) => updateEquipmentStatus(input.equipmentId, input.status)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Sound Equipment Warehouse Management TRPC server listening at port: ${port}`);
}

start();