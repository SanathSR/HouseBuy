const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');
console.log(process.env.DB_Host)
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

module.exports = client;