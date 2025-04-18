/**
 * index.js
 * Entry point for the book-service application.
 */

const express = require("express");
const app = express();
const booksRouter = require("./routes/books");

// Middleware to parse JSON requests
app.use(express.json());

// Status endpoint for health checks
app.get("/status", (req, res) => {
  res.status(200).json({ status: "book Service is running" });
});

// Mount the books routes at /books
app.use("/books", booksRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Book-service is running on port ${PORT}`);
});
