const Job = require("../models/Job");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const Offer = require("../models/Offer");
const User = require("../models/userModel");

const buildJobQueryForUser = (req) => {
  const query = {};
  const { status, mine } = req.query;

  if (status) {
    query.status = status;
  }

  // Students can only see active/screening jobs
  if (req.user?.role === "student") {
    query.status = query.status || "Active";
  }

  // HR can filter to jobs they created
  if (req.user?.role === "hr" && mine === "true") {
    query.createdBy = req.user.id;
  }

  return query;
};

const createJob = async (req, res) => {
  try {
    const { title, company, jobType, mode, location, salary, openings, status, eligibility, description, responsibilities, deadline } =
      req.body;

    if (!title || !company) {
      return res.status(400).json({ message: "Title and company are required" });
    }

    const job = await Job.create({
      title,
      company,
      jobType: jobType || "Full-time",
      mode: mode || "On-site",
      location,
      salary,
      openings,
      status: status || "Active",
      eligibility,
      description,
      responsibilities,
      deadline,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: "Job created", job });
  } catch (error) {
    console.error("Error in createJob:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const listJobs = async (req, res) => {
  try {
    const jobs = await Job.find(buildJobQueryForUser(req))
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ jobs, count: jobs.length });
  } catch (error) {
    console.error("Error in listJobs:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("createdBy", "name email role");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    const applicationsCount = await Application.countDocuments({ job: job._id });
    return res.status(200).json({ job, applicationsCount });
  } catch (error) {
    console.error("Error in getJobById:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can update" });
    }

    const allowedFields = [
      "title",
      "company",
      "jobType",
      "mode",
      "location",
      "salary",
      "openings",
      "status",
      "eligibility",
      "description",
      "responsibilities",
      "deadline",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    await job.save();
    return res.status(200).json({ message: "Job updated", job });
  } catch (error) {
    console.error("Error in updateJob:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can update" });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    job.status = status;
    await job.save();
    return res.status(200).json({ message: "Job status updated", job });
  } catch (error) {
    console.error("Error in updateJobStatus:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can delete" });
    }

    await Application.deleteMany({ job: job._id });
    await Interview.deleteMany({ job: job._id });
    await Offer.deleteMany({ job: job._id });
    await job.deleteOne();

    return res.status(200).json({ message: "Job deleted" });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const applyToJob = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (["Closed"].includes(job.status)) {
      return res.status(400).json({ message: "This job is not accepting applications" });
    }

    const existing = await Application.findOne({ job: jobId, student: studentId });
    if (existing) {
      return res.status(400).json({ message: "You already applied to this job" });
    }

    const student = await User.findById(studentId);
    let resumeUrl = student.resumeUrl;
    let resumeName = student.resumeOriginalName;

    if (req.file) {
      resumeUrl = `/uploads/resumes/${req.file.filename}`;
      resumeName = req.file.originalname;
      student.resumeUrl = resumeUrl;
      student.resumeOriginalName = resumeName;
      student.resumeUpdatedAt = new Date();
      await student.save();
    }

    if (!resumeUrl) {
      return res.status(400).json({ message: "Upload a resume to apply" });
    }

    const application = await Application.create({
      job: jobId,
      student: studentId,
      resumeUrl,
      resumeName,
      status: "Pending",
    });

    await application.populate("job", "title company status deadline location jobType");
    return res.status(201).json({ message: "Application submitted", application });
  } catch (error) {
    console.error("Error in applyToJob:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate("job", "title company status deadline location jobType")
      .sort({ createdAt: -1 });

    return res.status(200).json({ applications });
  } catch (error) {
    console.error("Error in getMyApplications:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can view applicants" });
    }

    const applications = await Application.find({ job: jobId })
      .populate("student", "name email department className")
      .populate("job", "title company");

    return res.status(200).json({ applications, count: applications.length });
  } catch (error) {
    console.error("Error in getJobApplications:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllApplicationsForHr = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user.id }).select("_id");
    const jobIds = jobs.map((job) => job._id);
    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("student", "name email department className")
      .populate("job", "title company");

    return res.status(200).json({ applications, count: applications.length });
  } catch (error) {
    console.error("Error in getAllApplicationsForHr:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate("job");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const isOwner = application.job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can update applications" });
    }

    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    application.status = status;
    if (notes !== undefined) {
      application.notes = notes;
    }
    await application.save();
    return res.status(200).json({ message: "Application status updated", application });
  } catch (error) {
    console.error("Error in updateApplicationStatus:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const scheduleInterview = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate("job student");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const isOwner = application.job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can schedule interviews" });
    }

    const { date, time, mode, roundType, meetingLink, status, notes } = req.body;
    if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required" });
    }

    const scheduledAt = new Date(`${date}T${time}`);
    const interview = await Interview.create({
      application: application._id,
      job: application.job._id,
      student: application.student._id,
      scheduledBy: req.user.id,
      scheduledAt,
      mode: mode || "Online",
      roundType: roundType || "Technical",
      meetingLink,
      status: status || "Scheduled",
      notes,
    });

    await interview.populate("job", "title company");
    return res.status(201).json({ message: "Interview scheduled", interview });
  } catch (error) {
    console.error("Error in scheduleInterview:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ student: req.user.id })
      .populate("job", "title company")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({ interviews });
  } catch (error) {
    console.error("Error in getMyInterviews:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const sendOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate("job student");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const isOwner = application.job.createdBy.toString() === req.user.id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only job owner or admin can send offers" });
    }

    const { ctc, status } = req.body;
    if (!ctc) {
      return res.status(400).json({ message: "CTC is required" });
    }

    let offerLetterUrl;
    let offerLetterName;
    if (req.file) {
      offerLetterUrl = `/uploads/offers/${req.file.filename}`;
      offerLetterName = req.file.originalname;
    }

    const offer = await Offer.create({
      application: application._id,
      job: application.job._id,
      student: application.student._id,
      issuedBy: req.user.id,
      ctc,
      status: status || "Pending",
      offerLetterUrl,
      offerLetterName,
    });

    application.status = "Offered";
    await application.save();

    await offer.populate("job", "title company");
    return res.status(201).json({ message: "Offer sent", offer });
  } catch (error) {
    console.error("Error in sendOffer:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getHrOffers = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user.id }).select("_id");
    const jobIds = jobs.map((job) => job._id);
    const offers = await Offer.find({ job: { $in: jobIds } })
      .populate("job", "title company")
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ offers, count: offers.length });
  } catch (error) {
    console.error("Error in getHrOffers:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ student: req.user.id })
      .populate("job", "title company")
      .sort({ createdAt: -1 });

    return res.status(200).json({ offers });
  } catch (error) {
    console.error("Error in getMyOffers:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getHrInterviews = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user.id }).select("_id");
    const jobIds = jobs.map((job) => job._id);
    const interviews = await Interview.find({ job: { $in: jobIds } })
      .populate("job", "title company")
      .populate("student", "name email")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({ interviews, count: interviews.length });
  } catch (error) {
    console.error("Error in getHrInterviews:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume file is required" });
    }
    const user = await User.findById(req.user.id);
    user.resumeUrl = `/uploads/resumes/${req.file.filename}`;
    user.resumeOriginalName = req.file.originalname;
    user.resumeUpdatedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Resume uploaded",
      resumeUrl: user.resumeUrl,
      resumeOriginalName: user.resumeOriginalName,
      resumeUpdatedAt: user.resumeUpdatedAt,
    });
  } catch (error) {
    console.error("Error in uploadResume:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "resumeUrl resumeOriginalName resumeUpdatedAt"
    );
    return res.status(200).json({
      resumeUrl: user.resumeUrl || null,
      resumeOriginalName: user.resumeOriginalName || null,
      resumeUpdatedAt: user.resumeUpdatedAt || null,
    });
  } catch (error) {
    console.error("Error in getMyResume:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  applyToJob,
  getMyApplications,
  getJobApplications,
  getAllApplicationsForHr,
  updateApplicationStatus,
  scheduleInterview,
  getMyInterviews,
  sendOffer,
  getMyOffers,
  getHrOffers,
  getHrInterviews,
  uploadResume,
  getMyResume,
};

