const mongoose = require("mongoose");
const Book = require("../models/Book");

const bookFields = [
  "title",
  "subtitle",
  "description",
  "authorName",
  "publisherName",
  "publishDate",
  "price",
  "purchasable",
  "imageUrl",
];

const pickBookBody = (body) => {
  const payload = {};
  for (const key of bookFields) {
    if (body[key] !== undefined) {
      payload[key] = body[key];
    }
  }
  return payload;
};

const createBook = async (req, res) => {
  try {
    const data = pickBookBody(req.body);
    const book = await Book.create(data);
    res.status(201).json(book);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "도서 생성에 실패했습니다." });
  }
};

const getBooks = async (req, res) => {
  try {
    const filter = {};
    const { purchasable } = req.query;
    if (purchasable === "true" || purchasable === "false") {
      filter.purchasable = purchasable === "true";
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "도서 목록 조회에 실패했습니다." });
  }
};

const getBookById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: "도서 조회에 실패했습니다." });
  }
};

const updateBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
    }

    const data = pickBookBody(req.body);
    const updated = await Book.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
    }

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "도서 수정에 실패했습니다." });
  }
};

const deleteBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
    }

    const deleted = await Book.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "도서가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "도서 삭제에 실패했습니다." });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
};
