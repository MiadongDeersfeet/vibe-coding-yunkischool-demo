require("dotenv").config();
const { MongoClient } = require("mongodb");

function getDbName(uri, fallback) {
  try {
    const parsed = new URL(uri);
    const pathname = (parsed.pathname || "").replace(/^\/+/, "");
    return pathname || fallback;
  } catch {
    return fallback;
  }
}

async function cloneDatabase({ fromDb, toDb, sourceLabel, targetLabel }) {
  const collections = await fromDb.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    const fromCol = fromDb.collection(name);
    const toCol = toDb.collection(name);

    await toCol.deleteMany({});

    const cursor = fromCol.find({});
    let batch = [];
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      batch.push(doc);
      if (batch.length >= 1000) {
        await toCol.insertMany(batch, { ordered: false });
        batch = [];
      }
    }
    if (batch.length > 0) {
      await toCol.insertMany(batch, { ordered: false });
    }

    const indexes = await fromCol.indexes();
    for (const index of indexes) {
      if (index.name === "_id_") continue;
      const { key, name: indexName, ...options } = index;
      await toCol.createIndex(key, { ...options, name: indexName });
    }

    const count = await toCol.countDocuments();
    console.log(`[${sourceLabel} -> ${targetLabel}] ${name}: ${count} docs`);
  }
}

async function main() {
  const localUri = process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27017/noor-tour";
  const remoteUri = process.env.MONGODB_URI;
  if (!remoteUri) {
    throw new Error("MONGODB_URI is required.");
  }

  const localDbName = getDbName(localUri, "noor-tour");
  const remoteDbName = getDbName(remoteUri, "yunkischooldemo");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const backupDbName = `${remoteDbName}_backup_${stamp}`;

  const localClient = new MongoClient(localUri);
  const remoteClient = new MongoClient(remoteUri);

  try {
    await localClient.connect();
    await remoteClient.connect();

    const localDb = localClient.db(localDbName);
    const remoteDb = remoteClient.db(remoteDbName);
    const backupDb = remoteClient.db(backupDbName);

    const localCollections = await localDb.listCollections({}, { nameOnly: true }).toArray();
    if (localCollections.length === 0) {
      throw new Error(`Local DB '${localDbName}' has no collections.`);
    }

    console.log(`Local DB: ${localDbName}`);
    console.log(`Remote DB: ${remoteDbName}`);
    console.log(`Backup DB: ${backupDbName}`);

    console.log("Step 1) Backing up remote DB...");
    await cloneDatabase({
      fromDb: remoteDb,
      toDb: backupDb,
      sourceLabel: remoteDbName,
      targetLabel: backupDbName,
    });

    console.log("Step 2) Dropping remote DB...");
    await remoteDb.dropDatabase();

    console.log("Step 3) Copying local DB to remote DB...");
    await cloneDatabase({
      fromDb: localDb,
      toDb: remoteDb,
      sourceLabel: localDbName,
      targetLabel: remoteDbName,
    });

    console.log("Done. Migration completed successfully.");
  } finally {
    await Promise.allSettled([localClient.close(), remoteClient.close()]);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
