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
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('Database connected successfully'));
pool.on('error', (err) => console.error('Unexpected DB error', err));

module.exports = pool;