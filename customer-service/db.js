/**
 * db.js
 * Handles MySQL database connection for customer-service.
 */

const mysql = require("mysql2");
require("dotenv").config(); // Using dotenv to load environment variables

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "customersdb",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the MySQL database:", err);
    process.exit(1);
  }
  console.log("Connected to the MySQL database.");
});

module.exports = connection;
