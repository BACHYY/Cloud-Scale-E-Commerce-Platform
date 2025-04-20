/**
 * customersController.js
 * Handles CRUD for customers and publishes “CustomerRegistered” events.
 */
const db = require("../db");
const producer = require("../utils/kafkaProducer");

// ───────────────────────────────────────────────────────────
//  POST  /customers
// ───────────────────────────────────────────────────────────
exports.addCustomer = (req, res) => {
  const { userId, name, phone, address, address2, city, state, zipcode } =
    req.body;

  /* 1 ─ Validate mandatory fields */
  if (!userId || !name || !phone || !address || !city || !state || !zipcode) {
    return res.status(400).json({ message: "Missing mandatory fields" });
  }

  /* 2 ─ Validate field formats */
  const emailRe = /^\S+@\S+\.\S+$/;
  const stateRe = /^[A-Za-z]{2}$/;
  if (!emailRe.test(userId))
    return res.status(400).json({ message: "Invalid email format for userId" });
  if (!stateRe.test(state))
    return res.status(400).json({ message: "Invalid state abbreviation" });

  /* 3 ─ Check uniqueness of userId */
  db.query(
    "SELECT id FROM customers WHERE userId = ?",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("Error checking userId:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (rows.length) {
        return res
          .status(422)
          .json({ message: "This user ID already exists in the system." });
      }

      /* 4 ─ Insert customer */
      const sql = `INSERT INTO customers
                 (userId,name,phone,address,address2,city,state,zipcode)
                 VALUES (?,?,?,?,?,?,?,?)`;
      const vals = [
        userId,
        name,
        phone,
        address,
        address2 || "",
        city,
        state,
        zipcode,
      ];

      db.query(sql, vals, async (insertErr, result) => {
        if (insertErr) {
          console.error("Error inserting customer:", insertErr);
          return res.status(500).json({ message: "Database error" });
        }

        /* 5 ─ Build response/body once */
        const newId = result.insertId;
        const responseBody = {
          id: newId,
          userId,
          name,
          phone,
          address,
          address2: address2 || "",
          city,
          state,
          zipcode,
        };

        /* 6 ─ Fire‑and‑forget Kafka event (never break the request) */
        (async () => {
          try {
            await producer.send({
              topic: `${process.env.ANDREW_ID}.customer.evt`,
              messages: [{ value: JSON.stringify(responseBody) }],
            });
          } catch (e) {
            console.error("Kafka send failed:", e);
          }
        })();

        /* 7 ─ HTTP 201 with Location header */
        const BASEURL = `${req.protocol}://${req.get("host")}`;
        res
          .status(201)
          .set("Location", `${BASEURL}/customers/${newId}`)
          .json(responseBody);
      });
    }
  );
};

// ───────────────────────────────────────────────────────────
//  GET /customers/:id          (numeric ID)
// ───────────────────────────────────────────────────────────
exports.getCustomerById = (req, res) => {
  const id = Number(req.params.id);
  if (!id)
    return res.status(400).json({ message: "Invalid or missing customer ID" });

  db.query("SELECT * FROM customers WHERE id = ?", [id], (err, rows) => {
    if (err) {
      console.error("Error fetching customer by ID:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });
    res.status(200).json(rows[0]);
  });
};

// ───────────────────────────────────────────────────────────
//  GET /customers?userId=email   (lookup by email)
// ───────────────────────────────────────────────────────────
exports.getCustomerByUserId = (req, res) => {
  const { userId } = req.query;
  if (!userId)
    return res.status(400).json({ message: "Missing userId query parameter" });

  const emailRe = /^\S+@\S+\.\S+$/;
  if (!emailRe.test(userId))
    return res.status(400).json({ message: "Invalid userId format" });

  db.query(
    "SELECT * FROM customers WHERE userId = ?",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("Error fetching customer by userId:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (!rows.length)
        return res.status(404).json({ message: "Customer not found" });
      res.status(200).json(rows[0]);
    }
  );
};
