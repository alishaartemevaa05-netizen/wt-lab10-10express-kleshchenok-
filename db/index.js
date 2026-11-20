const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/wt_lab8";

const useSsl = /render\.com/i.test(connectionString);
const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
});

pool.on("error", (error) => {
    console.error("Ошибка пула соединений PostgreSQL:", error.message);
});

module.exports = pool;