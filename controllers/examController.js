const Exam = require("../models/examModel");

// Create a new exam
const createExam = async (req, res) => {
  try {
    const { examTitle } = req.body;

    if (!examTitle || !examTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exam title is required",
      });
    }

    const exam = await Exam.create({
      examTitle: examTitle.trim(),
      subjects: [],
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create exam",
      error: error.message,
    });
  }
};

// Add a subject to an existing exam
const addSubjectToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { subjectName, examDate, examTime } = req.body;

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }

    if (!examDate) {
      return res.status(400).json({
        success: false,
        message: "Exam date is required",
      });
    }

    if (!examTime || !examTime.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exam time is required",
      });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.subjects.push({
      subjectName: subjectName.trim(),
      examDate: new Date(examDate),
      examTime: examTime.trim(),
    });

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Subject added to exam successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add subject to exam",
      error: error.message,
    });
  }
};

// Get all exams
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Exams fetched successfully",
      exams,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
      error: error.message,
    });
  }
};

// Get a single exam by ID
const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam fetched successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
      error: error.message,
    });
  }
};

// Delete an exam
const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findByIdAndDelete(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete exam",
      error: error.message,
    });
  }
};

// Delete a subject from an exam
const deleteSubjectFromExam = async (req, res) => {
  try {
    const { examId, subjectId } = req.params;

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const subjectIndex = exam.subjects.findIndex(
      (subject) => subject._id.toString() === subjectId
    );

    if (subjectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    exam.subjects.splice(subjectIndex, 1);
    await exam.save();

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete subject",
      error: error.message,
    });
  }
};

module.exports = {
  createExam,
  addSubjectToExam,
  getExams,
  getExamById,
  deleteExam,
  deleteSubjectFromExam,
};

