import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesPromise?: Promise<void>;
  mongoClient?: MongoClient;
};

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      retryWrites: true,
    });
    globalForMongo.mongoClient = client;
    globalForMongo.mongoClientPromise = client.connect();
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(env.mongodbDb);
  await ensureIndexes(db);
  return db;
}

export async function ensureIndexes(db: Db): Promise<void> {
  if (globalForMongo.mongoIndexesPromise) return globalForMongo.mongoIndexesPromise;
  globalForMongo.mongoIndexesPromise = (async () => {
    await Promise.all([
      db.collection("users").createIndexes([
        { key: { email: 1 }, unique: true, name: "users_email_unique" },
        { key: { googleSub: 1 }, unique: true, sparse: true, name: "users_google_unique" },
      ]),
      db.collection("sessions").createIndexes([
        { key: { tokenHash: 1 }, unique: true, name: "sessions_token_unique" },
        { key: { userId: 1 }, name: "sessions_user" },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "sessions_ttl" },
      ]),
      db.collection("customers").createIndexes([
        { key: { phone: 1 }, name: "customers_phone" },
        { key: { name: 1 }, name: "customers_name" },
        { key: { archived: 1, updatedAt: -1 }, name: "customers_active_recent" },
      ]),
      db.collection("products").createIndexes([
        { key: { slug: 1 }, unique: true, name: "products_slug_unique" },
        { key: { active: 1, displayOrder: 1 }, name: "products_public_order" },
      ]),
      db.collection("enquiries").createIndexes([
        { key: { submittedAt: -1 }, name: "enquiries_recent" },
        { key: { phone: 1 }, name: "enquiries_phone" },
      ]),
      db.collection("orders").createIndexes([
        { key: { ref: 1 }, unique: true, name: "orders_ref_unique" },
        { key: { idempotencyKey: 1 }, unique: true, sparse: true, name: "orders_idem_unique" },
        { key: { customerId: 1 }, name: "orders_customer" },
        { key: { orderDate: -1 }, name: "orders_date" },
        { key: { status: 1, orderDate: -1 }, name: "orders_status_date" },
        { key: { createdAt: -1 }, name: "orders_recent" },
        { key: { type: 1, orderDate: -1 }, name: "orders_type_date" },
      ]),
      db.collection("payments").createIndexes([
        { key: { orderId: 1 }, name: "payments_order" },
        { key: { date: -1 }, name: "payments_date" },
        { key: { idempotencyKey: 1 }, unique: true, sparse: true, name: "payments_idem_unique" },
      ]),
      db.collection("refunds").createIndexes([
        { key: { orderId: 1 }, name: "refunds_order" },
        { key: { date: -1 }, name: "refunds_date" },
        { key: { idempotencyKey: 1 }, unique: true, sparse: true, name: "refunds_idem_unique" },
      ]),
      db.collection("expenses").createIndexes([
        { key: { date: -1 }, name: "expenses_date" },
        { key: { category: 1, date: -1 }, name: "expenses_category_date" },
        { key: { inventoryItemId: 1 }, sparse: true, name: "expenses_item" },
        { key: { giftOrderId: 1 }, unique: true, sparse: true, name: "expenses_gift_unique" },
      ]),
      db.collection("inventory_items").createIndexes([
        { key: { name: 1 }, name: "inventory_name" },
        { key: { active: 1, category: 1 }, name: "inventory_active_category" },
      ]),
      db.collection("inventory_movements").createIndexes([
        { key: { itemId: 1, date: -1 }, name: "movements_item_date" },
        { key: { expenseId: 1 }, unique: true, sparse: true, name: "movements_expense_unique" },
      ]),
      db.collection("notification_jobs").createIndexes([
        { key: { idempotencyKey: 1 }, unique: true, name: "jobs_idem_unique" },
        { key: { status: 1, nextAttemptAt: 1 }, name: "jobs_due" },
        { key: { orderId: 1, createdAt: -1 }, name: "jobs_order" },
        { key: { createdAt: -1 }, name: "jobs_recent" },
      ]),
      db.collection("notification_events").createIndexes([
        { key: { jobId: 1, at: -1 }, name: "events_job_at" },
      ]),
      db.collection("message_templates").createIndexes([
        { key: { key: 1 }, unique: true, name: "templates_key_unique" },
      ]),
      db.collection("template_versions").createIndexes([
        { key: { templateId: 1, version: -1 }, name: "template_versions_template" },
      ]),
      db.collection("consents").createIndexes([
        { key: { phone: 1, purpose: 1 }, unique: true, name: "consents_phone_purpose" },
      ]),
      db.collection("website_content").createIndexes([
        { key: { page: 1 }, unique: true, name: "content_page_unique" },
      ]),
      db.collection("audit_logs").createIndexes([
        { key: { at: -1 }, name: "audit_recent" },
        { key: { entityType: 1, entityId: 1, at: -1 }, name: "audit_entity" },
        { key: { actorId: 1, at: -1 }, name: "audit_actor" },
      ]),
      db.collection("system_alerts").createIndexes([
        { key: { status: 1, createdAt: -1 }, name: "alerts_open" },
        { key: { type: 1, createdAt: -1 }, name: "alerts_type" },
      ]),
      db.collection("backup_runs").createIndexes([
        { key: { startedAt: -1 }, name: "backups_recent" },
      ]),
      db.collection("email_messages").createIndexes([
        { key: { orderId: 1, createdAt: -1 }, name: "emails_order" },
        { key: { createdAt: -1 }, name: "emails_recent" },
      ]),
      db.collection("import_batches").createIndexes([
        { key: { createdAt: -1 }, name: "imports_recent" },
        { key: { checksum: 1 }, name: "imports_checksum" },
      ]),
      db.collection("rate_limits").createIndexes([
        { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "rate_limits_ttl" },
      ]),
    ]);
  })().catch((error) => {
    globalForMongo.mongoIndexesPromise = undefined;
    throw error;
  });
  return globalForMongo.mongoIndexesPromise;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const client = await getMongoClient();
    await client.db(env.mongodbDb).command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
    globalForMongo.mongoClientPromise = undefined;
    globalForMongo.mongoIndexesPromise = undefined;
  }
}
