import mongoose, { type Model, Schema } from "mongoose";
import type { AutoSaveCadence, AutoSaveSource } from "@/lib/savings-auto-save";
import { generateId } from "@/lib/schema-ids";

export type AutoSaveOutcome = "saved" | "failed";

/** A standing instruction to top up one savings plan on a schedule. A plan has at most one. */
export interface IAutoSaveRule {
  _id: string;
  userId: string;
  planId: string;

  cadence: AutoSaveCadence;
  amount: number;
  currency: "NGN" | "USDC";
  source: AutoSaveSource;
  weekday: number;
  monthDay: number;
  intervalMinutes: number;
  /** `HH:mm` in `timeZone`. */
  time: string;
  /** The saver's IANA zone, so 9:30am stays 9:30am where they are. */
  timeZone: string;

  paused: boolean;
  nextRunAt: Date;
  lastRunAt?: Date | null;
  lastOutcome?: AutoSaveOutcome | null;
  lastError?: string | null;
  /** Failed runs in a row; reset by a successful run, a resume or an edit. */
  failedRuns: number;

  createdAt: Date;
  updatedAt: Date;
}

const AutoSaveRuleSchema = new Schema<IAutoSaveRule>(
  {
    _id: { type: String, default: () => generateId("asave") },
    userId: { type: String, required: true, index: true },
    planId: { type: String, required: true, unique: true },

    cadence: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["NGN", "USDC"], required: true },
    source: { type: String, enum: ["ngn", "usdc"], required: true },
    weekday: { type: Number, min: 0, max: 6, default: 1 },
    monthDay: { type: Number, min: 1, max: 31, default: 1 },
    intervalMinutes: { type: Number, min: 1, default: 60 },
    time: { type: String, required: true },
    timeZone: { type: String, required: true },

    paused: { type: Boolean, default: false },
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date, default: null },
    lastOutcome: {
      type: String,
      enum: ["saved", "failed", null],
      default: null,
    },
    lastError: { type: String, default: null },
    failedRuns: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
);

// The runner's only query: running rules that are due.
AutoSaveRuleSchema.index({ paused: 1, nextRunAt: 1 });

export const AutoSaveRule: Model<IAutoSaveRule> =
  mongoose.models.AutoSaveRule ||
  mongoose.model<IAutoSaveRule>("AutoSaveRule", AutoSaveRuleSchema);
