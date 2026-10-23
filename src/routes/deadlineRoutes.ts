import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Deadline, { DEADLINE_CATEGORIES } from "../models/Deadline.js";

const router = Router();

const ALLOWED_FIELDS = [
  "clientID",
  "title",
  "dueDate",
  "isUrgent",
  "category",
  "isCompleted",
] as const;

type DeadlineInput = {
  clientID?: string;
  title?: string;
  dueDate?: string;
  isUrgent?: boolean;
  category?: (typeof DEADLINE_CATEGORIES)[number];
  isCompleted?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInput(
  body: unknown,
  isUpdate = false,
): { data?: DeadlineInput; error?: string } {
  if (!isObject(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const keys = Object.keys(body);

  if (
    keys.some(
      (key) => !ALLOWED_FIELDS.includes(key as (typeof ALLOWED_FIELDS)[number]),
    )
  ) {
    return { error: "Request contains unsupported fields" };
  }

  if (isUpdate && keys.length === 0) {
    return { error: "Provide at least one field to update" };
  }

  const data: DeadlineInput = {};

  if ("clientID" in body) {
    if (
      typeof body.clientID !== "string" ||
      !body.clientID.trim() ||
      body.clientID.length > 100
    ) {
      return {
        error: "clientID must be a non-empty string of at most 100 characters",
      };
    }
    data.clientID = body.clientID.trim();
  }

  if (!isUpdate || "title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "A non-empty title is required" };
    }

    if (body.title.trim().length > 200) {
      return { error: "Title cannot exceed 200 characters" };
    }

    data.title = body.title.trim();
  }

  if (!isUpdate || "dueDate" in body) {
    if (
      typeof body.dueDate !== "string" ||
      !body.dueDate.trim() ||
      !Number.isFinite(Date.parse(body.dueDate))
    ) {
      return { error: "A valid dueDate string is required" };
    }

    data.dueDate = body.dueDate;
  }

  if ("isUrgent" in body) {
    if (typeof body.isUrgent !== "boolean") {
      return { error: "isUrgent must be a boolean" };
    }

    data.isUrgent = body.isUrgent;
  } else if (!isUpdate) {
    data.isUrgent = false;
  }

  if ("category" in body) {
    if (
      typeof body.category !== "string" ||
      !(DEADLINE_CATEGORIES as readonly string[]).includes(body.category)
    ) {
      return { error: "Invalid deadline category" };
    }

    data.category = body.category as DeadlineInput["category"];
  } else if (!isUpdate) {
    data.category = "Other";
  }

  if ("isCompleted" in body) {
    if (typeof body.isCompleted !== "boolean") {
      return { error: "isCompleted must be a boolean" };
    }

    data.isCompleted = body.isCompleted;
  } else if (!isUpdate) {
    data.isCompleted = false;
  }

  return { data };
}

// GET /api/deadlines
router.get("/", async (_req: Request, res: Response, next) => {
  try {
    const deadlines = await Deadline.find().sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: deadlines.length,
      data: deadlines,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/deadlines/:id
router.get("/:id", async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid deadline ID",
      });
      return;
    }

    const deadline = await Deadline.findById(id);

    if (!deadline) {
      res.status(404).json({
        success: false,
        message: "Deadline not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: deadline,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/deadlines
router.post("/", async (req: Request, res: Response, next) => {
  const validation = validateInput(req.body);

  if (validation.error || !validation.data) {
    res.status(400).json({
      success: false,
      message: validation.error ?? "Invalid request body",
    });
    return;
  }

  try {
    const { clientID, ...fields } = validation.data;

    // Repeated POSTs with the same clientID return the same MongoDB record.
    // This handles a server commit whose response was lost in transit.
    let deadline;
    if (clientID) {
      deadline = await Deadline.findOneAndUpdate(
        { clientID },
        { $setOnInsert: { ...fields, clientID } },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      deadline = await Deadline.create(fields);
    }

    res.status(201).json({ success: true, data: deadline });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
});

// PUT /api/deadlines/:id
router.put("/:id", async (req: Request, res: Response, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid deadline ID",
    });
    return;
  }

  if (isObject(req.body) && "clientID" in req.body) {
    res
      .status(400)
      .json({ success: false, message: "clientID cannot be changed" });
    return;
  }

  const validation = validateInput(req.body, true);

  if (validation.error || !validation.data) {
    res.status(400).json({
      success: false,
      message: validation.error ?? "Invalid request body",
    });
    return;
  }

  try {
    const deadline = await Deadline.findByIdAndUpdate(
      id,
      { $set: validation.data },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!deadline) {
      res.status(404).json({
        success: false,
        message: "Deadline not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: deadline,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
});

// DELETE /api/deadlines/:id
router.delete("/:id", async (req: Request, res: Response, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid deadline ID",
    });
    return;
  }

  try {
    const deadline = await Deadline.findByIdAndDelete(id);

    if (!deadline) {
      res.status(404).json({
        success: false,
        message: "Deadline not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Deadline deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
