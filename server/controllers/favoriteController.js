const mongoose = require("mongoose");
const LectureFavorite = require("../models/LectureFavorite");
const BookFavorite = require("../models/BookFavorite");
const Lecture = require("../models/Lecture");
const Book = require("../models/Book");

const listLectureFavorites = async (req, res) => {
  try {
    const rows = await LectureFavorite.find({ userId: req.userId })
      .populate("lectureId")
      .sort({ createdAt: -1 })
      .lean();

    const lectures = rows.map((r) => r.lectureId).filter(Boolean);
    res.status(200).json(lectures);
  } catch (error) {
    res.status(500).json({ message: "강의 찜 목록을 불러오지 못했습니다." });
  }
};

const listBookFavorites = async (req, res) => {
  try {
    const rows = await BookFavorite.find({ userId: req.userId })
      .populate("bookId")
      .sort({ createdAt: -1 })
      .lean();

    const books = rows.map((r) => r.bookId).filter(Boolean);
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "도서 찜 목록을 불러오지 못했습니다." });
  }
};

const addLectureFavorite = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    try {
      await LectureFavorite.create({ userId: req.userId, lectureId });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({ message: "이미 찜한 강의입니다.", already: true });
      }
      throw error;
    }

    res.status(201).json({ message: "찜 목록에 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "찜하기에 실패했습니다." });
  }
};

const removeLectureFavorite = async (req, res) => {
  try {
    const { lectureId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
    }

    await LectureFavorite.deleteOne({ userId: req.userId, lectureId });
    res.status(200).json({ message: "찜이 해제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "찜 해제에 실패했습니다." });
  }
};

const addBookFavorite = async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
    }

    try {
      await BookFavorite.create({ userId: req.userId, bookId });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({ message: "이미 찜한 도서입니다.", already: true });
      }
      throw error;
    }

    res.status(201).json({ message: "찜 목록에 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "찜하기에 실패했습니다." });
  }
};

const removeBookFavorite = async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
    }

    await BookFavorite.deleteOne({ userId: req.userId, bookId });
    res.status(200).json({ message: "찜이 해제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "찜 해제에 실패했습니다." });
  }
};

module.exports = {
  listLectureFavorites,
  listBookFavorites,
  addLectureFavorite,
  removeLectureFavorite,
  addBookFavorite,
  removeBookFavorite,
};
