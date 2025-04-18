const express = require("express");
const router = express.Router();
const booksController = require("../controllers/booksController");

// Route for adding a book
router.post("/", booksController.addBook);

// Route for update book
router.put("/:ISBN", booksController.updateBook);

// Existing GET route (if you already have /:ISBN)
router.get("/:ISBN", booksController.getBookByISBN);

// New GET route for /isbn/:ISBN
router.get("/isbn/:ISBN", booksController.getBookByISBN);

module.exports = router;
