// routes/customers.js
const express = require("express");
const router = express.Router();
const customersController = require("../controllers/customersController");

// route to add a new customer
router.post("/", customersController.addCustomer);

// GET route to get customer by numeric ID
router.get("/:id", customersController.getCustomerById);
// GET route to get customer by userId (email)
router.get("/", customersController.getCustomerByUserId);

module.exports = router;
