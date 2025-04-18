/**
 * index.js
 * Entry point for the bookstore-mobile-bff application.
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
  res.status(200).json({ status: "Mobile BFF Service is running" });
});

// Apply authentication middleware to all endpoints except /status
app.use(["/books", "/customers"], authMiddleware);

// Proxy handler for both /books and /customers endpoints
app.use(["/books", "/customers"], async (req, res) => {
  // req.baseUrl is the mount path (either '/books' or '/customers')
  // req.url is the remaining path.

  const targetBase =
    req.baseUrl === "/books" ? BOOK_SERVICE_URL : CUSTOMER_SERVICE_URL;
  const targetUrl = `${targetBase}${ensureLeadingSlash(req.path)}`;
  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        "Content-Type": "application/json",
        // Optionally, remove the 'host' header if necessary:
        // ...omit host header if it causes issues
      },
      timeout: 10000, // 10-second timeout
    };

    const response = await axios(axiosConfig);
    let responseData = response.data;

    // Mobile-specific transformation for GET requests.
    if (req.method === "GET") {
      if (req.baseUrl === "/books") {
        // If genre is "non-fiction", replace with numeric 3.
        if (
          responseData &&
          typeof responseData === "object" &&
          responseData.genre === "non-fiction"
        ) {
          responseData.genre = 3;
        }
      } else if (req.baseUrl === "/customers") {
        // Remove specified attributes from customer responses.
        if (responseData && typeof responseData === "object") {
          const fieldsToRemove = [
            "address",
            "address2",
            "city",
            "state",
            "zipcode",
          ];
          fieldsToRemove.forEach((field) => delete responseData[field]);
        }
      }
    }

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
