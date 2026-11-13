import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type AutoSaveSchedule, nextAutoSaveRun } from "./auto-save-schedule";

const LAGOS: AutoSaveSchedule = {
  cadence: "daily",
  weekday: 1,
  monthDay: 1,
  intervalMinutes: 60,
  time: "09:30",
  timeZone: "Africa/Lagos",
};

const at = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

describe("nextAutoSaveRun", () => {
  it("runs later today when the time has not passed", () => {
    assert.equal(
      iso(nextAutoSaveRun(LAGOS, at("2026-11-13T07:00:00Z"))),
      "2026-11-13T08:30:00.000Z",
    );
  });

  it("runs tomorrow once today's time has passed, never at the same instant", () => {
    assert.equal(
      iso(nextAutoSaveRun(LAGOS, at("2026-11-13T08:30:00Z"))),
      "2026-11-14T08:30:00.000Z",
    );
  });

  it("finds the next chosen weekday", () => {
    // 2026-11-13 is a Friday; weekday 1 is Monday.
    const weekly = { ...LAGOS, cadence: "weekly" as const };
    assert.equal(
      iso(nextAutoSaveRun(weekly, at("2026-11-13T12:00:00Z"))),
      "2026-11-16T08:30:00.000Z",
    );
  });

  it("falls back to a short month's last day", () => {
    const monthly = { ...LAGOS, cadence: "monthly" as const, monthDay: 31 };
    assert.equal(
      iso(nextAutoSaveRun(monthly, at("2026-11-13T12:00:00Z"))),
      "2026-11-30T08:30:00.000Z",
    );
    assert.equal(
      iso(nextAutoSaveRun(monthly, at("2027-02-01T12:00:00Z"))),
      "2027-02-28T08:30:00.000Z",
    );
  });

  it("keeps wall-clock time across a daylight-saving change", () => {
    const newYork = { ...LAGOS, timeZone: "America/New_York" };
    assert.equal(
      iso(nextAutoSaveRun(newYork, at("2026-03-07T15:00:00Z"))),
      "2026-03-08T13:30:00.000Z",
    );
  });

  it("spaces a custom gap from the previous run", () => {
    const custom = { ...LAGOS, cadence: "custom" as const, intervalMinutes: 5 };
    const anchor = at("2026-11-13T10:00:00Z");
    assert.equal(
      iso(nextAutoSaveRun(custom, at("2026-11-13T10:00:40Z"), anchor)),
      "2026-11-13T10:05:00.000Z",
    );
  });

  it("skips custom runs missed while the job was down", () => {
    const custom = { ...LAGOS, cadence: "custom" as const, intervalMinutes: 5 };
    const anchor = at("2026-11-13T10:00:00Z");
    assert.equal(
      iso(nextAutoSaveRun(custom, at("2026-11-13T10:17:00Z"), anchor)),
      "2026-11-13T10:20:00.000Z",
    );
  });
});
