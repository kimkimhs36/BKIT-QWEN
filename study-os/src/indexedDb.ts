/** Some storage failures throw before a transaction exists, so no abort/error
 * listener can close the database. Keep those connections out of future opens. */
export function guardedTransaction(
  database: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  try {
    return database.transaction(stores, mode);
  } catch (error) {
    database.close();
    throw error;
  }
}
