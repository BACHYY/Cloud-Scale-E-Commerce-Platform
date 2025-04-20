const db = require("../db");

const recommenderBreaker = require("../utils/recommenderBreaker");
const { CircuitBreakerOpenError } = require("opossum");

// add book
exports.addBook = (req, res) => {
  const { ISBN, title, Author, description, genre, price, quantity } = req.body;

  //  Validate all fields are present
  if (
    !ISBN ||
    !title ||
    !Author ||
    !description ||
    !genre ||
    price === undefined ||
    quantity === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //  Validate price format (must be a number with 2 decimal places)
  if (!/^\d+(\.\d{2})?$/.test(price)) {
    return res
      .status(400)
      .json({ message: "Price must be a valid number with 2 decimal places" });
  }

  //  Validate quantity is a positive integer
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res
      .status(400)
      .json({ message: "Quantity must be a non-negative integer" });
  }

  // Insert book into MySQL
  const sql =
    "INSERT INTO books (ISBN, title, author, description, genre, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [ISBN, title, Author, description, genre, price, quantity];

  db.query(sql, values, async (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res
          .status(422)
          .json({ message: "This ISBN already exists in the system." });
      }
      console.error("Error inserting book:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Construct the BASEURL dynamically
    const BASEURL = `${req.protocol}://${req.get("host")}`;

    res
      .status(201)
      .set("Location", `${BASEURL}/books/${ISBN}`) //  Add the Location header
      .json({
        ISBN,
        title,
        Author,
        description,
        genre,
        price: parseFloat(price),
        quantity,
      });
  });
};
// update book
exports.updateBook = (req, res) => {
  const pathISBN = req.params.ISBN;

  const { ISBN, title, Author, description, genre, price, quantity } = req.body;

  // 1) Validate that all fields are present
  if (
    !ISBN ||
    !title ||
    !Author ||
    !description ||
    !genre ||
    price === undefined ||
    quantity === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // 2) Validate that path param ISBN matches body ISBN
  //    (Because the assignment’s example request includes "ISBN" in the body as well.)
  if (pathISBN !== ISBN) {
    return res
      .status(400)
      .json({ message: "ISBN in path and body must match" });
  }

  // 3) Validate price format: must be a valid number with 2 decimal places
  if (!/^\d+(\.\d{2})?$/.test(price)) {
    return res
      .status(400)
      .json({ message: "Price must be a valid number with 2 decimal places" });
  }

  // 4) Validate quantity is a non-negative integer
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res
      .status(400)
      .json({ message: "Quantity must be a non-negative integer" });
  }

  // 5) Update the book in MySQL
  //    - If your DB column is lowercase "author", map "Author" -> "author".
  const sql = `
      UPDATE books
      SET
        title       = ?,
        author      = ?,
        description = ?,
        genre       = ?,
        price       = ?,
        quantity    = ?
      WHERE ISBN    = ?
    `;

  // Note: The DB column for "Author" is "author".
  // We use the request body "Author" to update the "author" column.
  const values = [title, Author, description, genre, price, quantity, ISBN];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating book:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // If no rows were affected, the ISBN doesn't exist in the DB
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    // 6) Return the updated resource representation
    // do a SELECT to ensure we return what’s in the DB.

    const fetchSql = `SELECT * FROM books WHERE ISBN = ?`;
    db.query(fetchSql, [ISBN], async (err, rows) => {
      if (err) {
        console.error("Error fetching updated book:", err);
        return res.status(500).json({ message: "Database error" });
      }
      // Safety check, though we expect 1 row if updated
      if (!rows.length) {
        return res.status(404).json({ message: "Book not found after update" });
      }

      const updatedBook = rows[0];

      // Respond using the assignment’s field names exactly:
      res.status(200).json({
        ISBN: updatedBook.ISBN,
        title: updatedBook.title,
        Author: updatedBook.author, // or updatedBook.Author if your column is spelled that way
        description: updatedBook.description,
        genre: updatedBook.genre,
        price: parseFloat(updatedBook.price),
        quantity: updatedBook.quantity,
      });
    });
  });
};

// GET /books/:ISBN and GET /books/isbn/:ISBN
exports.getBookByISBN = (req, res) => {
  const { ISBN } = req.params;

  // Query the DB
  const sql = "SELECT * FROM books WHERE ISBN = ?";
  db.query(sql, [ISBN], (err, results) => {
    if (err) {
      console.error("Error fetching book:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      // ISBN not found
      return res.status(404).json({ message: "Book not found" });
    }

    // Return the found book
    const book = results[0];
    res.status(200).json({
      ISBN: book.ISBN,
      title: book.title,
      Author: book.author,
      description: book.description,
      genre: book.genre,
      price: parseFloat(book.price),
      quantity: book.quantity,
    });
  });
};

// GET /books/:ISBN/related-books
// ────────────────────────────────────────────────────────────
//  GET /books/:ISBN/related-books
//  • 3 s timeout
//  • 504 on first timeout
//  • Circuit opens immediately; 503 while open (60 s)
//  • Success → 200 array; Empty → 204
// ────────────────────────────────────────────────────────────
// GET /books/:ISBN/related-books  (Circuit‑breaker protected)
exports.getRelatedBooks = async (req, res) => {
  const { ISBN } = req.params;
  try {
    const result = await recommenderBreaker.fire(ISBN);

    // result can be either an array OR { related: array }
    const related = Array.isArray(result) ? result : result.related || [];

    if (related.length === 0) {
      return res.status(204).send();
    }
    return res.status(200).json({ ISBN, related });
  } catch (err) {
    if (err.code === "ECONNABORTED") {
      return res
        .status(504)
        .json({ message: "Recommendation service timeout" });
    }
    if (err instanceof CircuitBreakerOpenError) {
      return res
        .status(503)
        .json({ message: "Recommendation service unavailable" });
    }
    console.error("Recommender call failed:", err);
    return res.status(502).json({ message: "Upstream error" });
  }
};
