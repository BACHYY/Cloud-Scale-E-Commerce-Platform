/**
 * index.js
 * Entry point for the bookstore-web-bff application.
 */

const express = require("express");
const axios = require("axios");
const authMiddleware = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 80;

// Individual internal service URLs (set via K8S env vars)
const BOOK_SERVICE_URL =
  process.env.BOOK_SERVICE_URL || "http://localhost:3001";
const CUSTOMER_SERVICE_URL =
  process.env.CUSTOMER_SERVICE_URL || "http://localhost:3002";

app.use(express.json());

// Health check endpoint (no authentication required)
app.get("/status", (req, res) => {
  res.status(200).json({ status: "WEB BFF Service is running" });
});

// Apply authentication middleware to all endpoints except /status
app.use(["/books", "/customers"], authMiddleware);

// Helper function: ensure a path starts with a slash
const ensureLeadingSlash = (url) => (url.startsWith("/") ? url : "/" + url);

// Proxy handler for both /books and /customers endpoints
app.use(["/books", "/customers"], async (req, res) => {
  // Use req.baseUrl (mount path) and req.path (without query string)
  const targetBase =
    req.baseUrl === "/books" ? BOOK_SERVICE_URL : CUSTOMER_SERVICE_URL;
  const targetUrl = `${targetBase}${req.baseUrl}${ensureLeadingSlash(
    req.path
  )}`;
  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query, // Let axios handle query parameters
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10-second timeout
    };

    const response = await axios(axiosConfig);
    let responseData = response.data;

    res.status(response.status).json(responseData);
  } catch (error) {
    console.error("Error proxying request:", error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: "Error connecting to backend service" });
    }
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Bookstore-mobile-bff is running on port ${PORT}`);
});
