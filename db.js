/* const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');
console.log(process.env.DB_Host,process.env.DB_User,process.env.DB_Port,process.env.DB_Password,process.env.DB_Name)
const client = new Pool({

    host: process.env.DB_Host,
    user: process.env.DB_User,
    port: process.env.DB_Port,
    password: process.env.DB_Password,
    database: process.env.DB_Name,

    ssl: {
        rejectUnauthorized: false
    }

});

module.exports = client; */
/* const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('Database connected successfully'));
pool.on('error', (err) => console.error('Unexpected DB error', err));

module.exports = pool; */
const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Reuse connections instead of creating one for every query
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  console.log('New PostgreSQL connection created');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Test the database when the application starts
async function initializeDatabase() {
  try {
    const client = await pool.connect();

    try {
      await client.query('SELECT 1');
      console.log('Database connected successfully');
    } finally {
      client.release(); // Return connection to the pool
    }
  } catch (err) {
    console.error('Database connection failed:', err.message);
    throw err;
  }
}

module.exports = { pool, initializeDatabase };