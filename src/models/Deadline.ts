
import mongoose, { Schema, Document } from "mongoose";

export const DEADLINE_CATEGORIES = [
  "Study",
  "Work",
  "Personal",
  "Health",
  "Other",
] as const;

export type DeadlineCategory =
  (typeof DEADLINE_CATEGORIES)[number];

export interface IDeadline extends Document {
  title: string;
  dueDate: Date;
  isUrgent: boolean;
  category: DeadlineCategory;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deadlineSchema = new Schema<IDeadline>(
  {
    title: {
      type: String,
      required: [true, "Deadline title is required"],
      trim: true,
      minlength: [1, "Deadline title cannot be empty"],
      maxlength: [200, "Deadline title cannot exceed 200 characters"],
      validate: {
        validator: (value: string) => value.trim().length > 0,
        message: "Deadline title cannot contain only whitespace",
      },
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: (value: Date) =>
          value instanceof Date && !Number.isNaN(value.getTime()),
        message: "Due date must be a valid date",
      },
    },

    isUrgent: {
      type: Boolean,
      default: false,
    },

    category: {
      type: String,
      enum: {
        values: [...DEADLINE_CATEGORIES],
        message: "Invalid deadline category",
      },
      default: "Other",
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model<IDeadline>(
  "Deadline",
  deadlineSchema
);
