/**
 * middleware/auth.js
 * Middleware for validating the X-Client-Type header and JWT token.
 */

module.exports = (req, res, next) => {
  // Validate X-Client-Type header is present.
  const clientType = req.headers["x-client-type"];
  if (!clientType) {
    return res.status(400).json({ message: "Missing X-Client-Type header" });
  }

  // Validate Authorization header is present.
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res
      .status(401)
      .json({ message: "Invalid Authorization header format" });
  }

  const token = parts[1];
  try {
    // Decode the JWT payload (second part of the token).
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return res.status(401).json({ message: "Invalid JWT token format" });
    }

    const payloadBase64 = tokenParts[1];
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);

    // Validate token claims.
    const allowedSubs = ["starlord", "gamora", "drax", "rocket", "groot"];
    if (!payload.sub || !allowedSubs.includes(payload.sub)) {
      return res.status(401).json({ message: "Invalid token subject" });
    }

    // Check token expiration (JWT exp is typically in seconds).
    if (
      !payload.exp ||
      typeof payload.exp !== "number" ||
      payload.exp * 1000 < Date.now()
    ) {
      return res.status(401).json({ message: "Token has expired" });
    }

    // Verify issuer.
    if (!payload.iss || payload.iss !== "cmu.edu") {
      return res.status(401).json({ message: "Invalid token issuer" });
    }

    // Attach the token payload to the request for downstream use.
    req.user = payload;
    next();
  } catch (error) {
    console.error("Error processing JWT token:", error);
    return res.status(401).json({ message: "Invalid JWT token" });
  }
};
