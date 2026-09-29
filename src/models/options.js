export function modelOptions(tableName) {
  return {
    schema: process.env.DB_USE_TEST_SCHEMA === 'true'
      ? process.env.DB_TEST_SCHEMA
      : process.env.DB_SCHEMA,
    tableName,
    timestamps: true,
  };
}
