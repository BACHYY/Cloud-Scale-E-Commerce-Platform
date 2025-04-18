// controllers/customersController.js
const db = require("../db");

// Add customers
exports.addCustomer = (req, res) => {
  const { userId, name, phone, address, address2, city, state, zipcode } =
    req.body;

  // 1) Check mandatory fields (everything except address2)
  if (!userId || !name || !phone || !address || !city || !state || !zipcode) {
    return res.status(400).json({ message: "Missing mandatory fields" });
  }

  // 2) Validate userId is an email (simple regex check)
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(userId)) {
    return res.status(400).json({ message: "Invalid email format for userId" });
  }

  // 3) Validate state is 2-letter US abbreviation
  const stateAbbrRegex = /^[A-Za-z]{2}$/;
  if (!stateAbbrRegex.test(state)) {
    return res.status(400).json({ message: "Invalid state abbreviation" });
  }

  // 4) Check if userId already exists
  const checkSql = "SELECT id FROM customers WHERE userId = ?";
  db.query(checkSql, [userId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Error checking userId:", checkErr);
      return res.status(500).json({ message: "Database error" });
    }

    if (checkResult.length > 0) {
      // userId already exists
      return res
        .status(422)
        .json({ message: "This user ID already exists in the system." });
    }

    // 5) Insert new customer
    const insertSql = `
      INSERT INTO customers
      (userId, name, phone, address, address2, city, state, zipcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      userId,
      name,
      phone,
      address,
      address2 || "",
      city,
      state,
      zipcode,
    ];

    db.query(insertSql, values, (insertErr, insertResult) => {
      if (insertErr) {
        console.error("Error inserting customer:", insertErr);
        return res.status(500).json({ message: "Database error" });
      }

      // 6) Construct the BASEURL dynamically
      const BASEURL = `${req.protocol}://${req.get("host")}`;

      // 7) Return 201 + Location header
      const newCustomerId = insertResult.insertId;
      res
        .status(201)
        .set("Location", `${BASEURL}/customers/${newCustomerId}`)
        .json({
          id: newCustomerId,
          userId,
          name,
          phone,
          address,
          address2: address2 || "",
          city,
          state,
          zipcode,
        });
    });
  });
};
// get customer by numeric ID
exports.getCustomerById = (req, res) => {
  const { id } = req.params;

  // 1) Validate "id" is a numeric value
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: "Invalid or missing customer ID" });
  }

  // 2) Query DB for the given numeric ID
  const sql = "SELECT * FROM customers WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching customer by ID:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      // ID not found
      return res.status(404).json({ message: "Customer not found" });
    }

    // 3) Return the customer data
    const customer = results[0];
    res.status(200).json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      address2: customer.address2,
      city: customer.city,
      state: customer.state,
      zipcode: customer.zipcode,
    });
  });
};

// get customer by userId (email)

exports.getCustomerByUserId = (req, res) => {
  const { userId } = req.query;

  // 1) Check if userId is present
  if (!userId) {
    return res.status(400).json({ message: "Missing userId query parameter" });
  }

  // 2) Validate userId format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(userId)) {
    return res.status(400).json({ message: "Invalid userId format" });
  }

  // 3) Query DB for the given userId (email)
  const sql = "SELECT * FROM customers WHERE userId = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching customer by userId:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      // userId not found
      return res.status(404).json({ message: "Customer not found" });
    }

    // 4) Return the customer data
    const customer = results[0];
    res.status(200).json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      address2: customer.address2,
      city: customer.city,
      state: customer.state,
      zipcode: customer.zipcode,
    });
  });
};
