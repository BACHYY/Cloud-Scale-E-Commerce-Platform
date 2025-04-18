/**
 * index.js
 * Entry point for the customer-service application.
 */

const express = require("express");
const app = express();
const customersRouter = require("./routes/customers");

// Middleware to parse JSON requests
app.use(express.json());

// Status endpoint for health checks
app.get("/status", (req, res) => {
  res.status(200).json({ status: "Customer Service is running" });
});

// Mount customer routes at /customers
app.use("/customers", customersRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Customer-service is running on port ${PORT}`);
});
