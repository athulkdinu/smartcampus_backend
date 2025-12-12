const SkillRound = require("../models/SkillRound");
const SkillCourse = require("../models/SkillCourse");
const SkillEnrollment = require("../models/SkillEnrollment");

// Create or update round
const createOrUpdateRound = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { roundNumber, lessonTitle, contentType, videoUrl, textContent, quizTitle, questions, projectTitle, projectBrief, projectRequirements } = req.body;

    if (!roundNumber || ![1, 2, 3, 4].includes(roundNumber)) {
      return res.status(400).json({ message: "Invalid round number" });
    }

    let roundData = {
      course: course._id,
      roundNumber,
    };

    if (roundNumber === 1) {
      roundData.lessonTitle = lessonTitle || "";
      roundData.contentType = contentType || "text";
      roundData.videoUrl = videoUrl || "";
      roundData.textContent = textContent || "";
    } else if (roundNumber === 2 || roundNumber === 4) {
      roundData.quizTitle = quizTitle || "";
      roundData.questions = questions || [];
    } else if (roundNumber === 3) {
      roundData.projectTitle = projectTitle || "";
      roundData.projectBrief = projectBrief || "";
      roundData.projectRequirements = projectRequirements || [];
    }

    const round = await SkillRound.findOneAndUpdate(
      { course: course._id, roundNumber },
      roundData,
      { new: true, upsert: true }
    );

    return res.status(200).json({ message: "Round saved", round });
  } catch (error) {
    console.error("Error in createOrUpdateRound:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Submit quiz (Round 2 or 4)
const submitQuiz = async (req, res) => {
  try {
    const { roundNumber, answers } = req.body; // answers: [0, 1, 2, ...] array of selected option indices

    const enrollment = await SkillEnrollment.findOne({
      course: req.params.courseId,
      student: req.user.id,
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled" });
    }

    const round = await SkillRound.findOne({
      course: req.params.courseId,
      roundNumber,
    });

    if (!round || !round.questions || round.questions.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check prerequisites
    if (roundNumber === 2 && !enrollment.progress.round1Completed) {
      return res.status(400).json({ message: "Complete Round 1 first" });
    }
    if (roundNumber === 4 && !enrollment.progress.round3Approved) {
      return res.status(400).json({ message: "Project must be approved first" });
    }

    // Calculate score
    let correct = 0;
    round.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const score = Math.round((correct / round.questions.length) * 100);
    const course = await SkillCourse.findById(req.params.courseId);
    const passed = score >= course.passThreshold;

    // Update enrollment
    if (roundNumber === 2) {
      enrollment.progress.round2Completed = passed;
      enrollment.round2Score = score;
    } else if (roundNumber === 4) {
      enrollment.progress.round4Completed = passed;
      enrollment.round4Score = score;
      if (passed) {
        enrollment.progress.completed = true;
      }
    }

    await enrollment.save();

    return res.status(200).json({
      message: passed ? "Quiz passed" : "Quiz failed",
      score,
      passed,
      correct,
      total: round.questions.length,
    });
  } catch (error) {
    console.error("Error in submitQuiz:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark Round 1 as completed
const completeRound1 = async (req, res) => {
  try {
    const enrollment = await SkillEnrollment.findOne({
      course: req.params.courseId,
      student: req.user.id,
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled" });
    }

    enrollment.progress.round1Completed = true;
    await enrollment.save();

    return res.status(200).json({ message: "Round 1 completed", enrollment });
  } catch (error) {
    console.error("Error in completeRound1:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrUpdateRound,
  submitQuiz,
  completeRound1,
};



