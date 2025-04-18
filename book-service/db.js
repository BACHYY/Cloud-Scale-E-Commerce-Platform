/**
 * db.js
 * Handles MySQL database connection.
 */

const mysql = require("mysql2");
require("dotenv").config(); // Ensure to install and require dotenv if using .env

// Create the MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "booksdb",
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    process.exit(1);
  }
  console.log("Connected to the MySQL database.");
});

module.exports = connection;
