const mongoose = require("mongoose");
const Lecture = require("../models/Lecture");

const LANGUAGE_KEYS = ["kr", "en", "ar", "he"];

const lectureFields = [
  "title",
  "instructorName",
  "price",
  "imageUrl",
  "shortDescription",
  "description",
  "categoryId",
  "categoryName",
  "languageKey",
  "isActive",
];

const pickLectureBody = (body) => {
  const payload = {};
  for (const key of lectureFields) {
    if (body[key] !== undefined) {
      payload[key] = body[key];
    }
  }
  return payload;
};

const createLecture = async (req, res) => {
  try {
    const data = pickLectureBody(req.body);

    if (!data.languageKey || !LANGUAGE_KEYS.includes(data.languageKey)) {
      return res.status(400).json({ message: "languageKey는 kr, en, ar, he 중 하나여야 합니다." });
    }

    const categoryIdRaw = data.categoryId;
    if (categoryIdRaw === undefined || categoryIdRaw === null || categoryIdRaw === "") {
      data.categoryId = new mongoose.Types.ObjectId();
    } else if (!mongoose.Types.ObjectId.isValid(String(categoryIdRaw))) {
      return res.status(400).json({ message: "categoryId는 유효한 ObjectId여야 합니다." });
    }

    if (!data.categoryName || !String(data.categoryName).trim()) {
      data.categoryName = "미분류";
    }

    const lecture = await Lecture.create(data);
    res.status(201).json(lecture);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "강의 생성에 실패했습니다." });
  }
};

const getLectures = async (req, res) => {
  try {
    const filter = {};

    const { categoryId, isActive, languageKey } = req.query;
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
        return res.status(400).json({ message: "categoryId가 유효하지 않습니다." });
      }
      filter.categoryId = categoryId;
    }
    if (languageKey && LANGUAGE_KEYS.includes(String(languageKey))) {
      filter.languageKey = languageKey;
    }
    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    const lectures = await Lecture.find(filter).sort({ createdAt: -1 });
    res.status(200).json(lectures);
  } catch (error) {
    res.status(500).json({ message: "강의 목록 조회에 실패했습니다." });
  }
};

const getLectureById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
    }

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    res.status(200).json(lecture);
  } catch (error) {
    res.status(500).json({ message: "강의 조회에 실패했습니다." });
  }
};

const updateLecture = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
    }

    const data = pickLectureBody(req.body);
    if (data.languageKey !== undefined && !LANGUAGE_KEYS.includes(data.languageKey)) {
      return res.status(400).json({ message: "languageKey는 kr, en, ar, he 중 하나여야 합니다." });
    }
    if (data.categoryId !== undefined && !mongoose.Types.ObjectId.isValid(String(data.categoryId))) {
      return res.status(400).json({ message: "categoryId는 유효한 ObjectId여야 합니다." });
    }

    const updated = await Lecture.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "강의 수정에 실패했습니다." });
  }
};

const deleteLecture = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
    }

    const deleted = await Lecture.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "강의가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: "강의 삭제에 실패했습니다." });
  }
};

module.exports = {
  createLecture,
  getLectures,
  getLectureById,
  updateLecture,
  deleteLecture,
};
