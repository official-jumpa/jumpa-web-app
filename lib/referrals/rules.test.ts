import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { campaignStatus, isInCampaign, parseCampaignDate } from "./campaign";
import { firstName, publicName } from "./names";
import {
  formatRewardNaira,
  isReferralClaimReference,
  normalizeReferralCode,
} from "./rules";

describe("normalizeReferralCode", () => {
  test("uppercases and trims a real code", () => {
    assert.equal(normalizeReferralCode(" r7k9wz "), "R7K9WZ");
    assert.equal(normalizeReferralCode("ref-abc123"), "REF-ABC123");
  });

  test("refuses anything that could reach a query as a pattern", () => {
    assert.equal(normalizeReferralCode(".*"), null);
    assert.equal(normalizeReferralCode("R7K9WZ|^"), null);
    assert.equal(
      normalizeReferralCode("https://usejumpa.com/sign-up?ref=R7K9WZ"),
      null,
    );
    assert.equal(normalizeReferralCode(""), null);
    assert.equal(normalizeReferralCode(undefined), null);
    assert.equal(normalizeReferralCode({ $ne: null }), null);
  });
});

describe("campaign window", () => {
  const start = new Date("2026-12-01T00:00:00Z");
  const end = new Date("2027-01-01T00:00:00Z");

  test("is off without a start date", () => {
    const off = { start: null, end: null };
    assert.equal(isInCampaign(off, new Date()), false);
    assert.equal(campaignStatus(off, new Date()), "off");
  });

  test("runs from the start up to, not including, the end", () => {
    const window = { start, end };
    assert.equal(
      campaignStatus(window, new Date("2026-11-30T23:59:59Z")),
      "upcoming",
    );
    assert.equal(isInCampaign(window, start), true);
    assert.equal(
      campaignStatus(window, new Date("2026-12-15T00:00:00Z")),
      "live",
    );
    assert.equal(isInCampaign(window, end), false);
    assert.equal(campaignStatus(window, end), "ended");
  });

  test("reads only ISO dates from the env", () => {
    assert.equal(
      parseCampaignDate("T", "2026-12-01T00:00:00+01:00")?.toISOString(),
      "2026-11-30T23:00:00.000Z",
    );
    assert.equal(
      parseCampaignDate("T", " 2026-12-01 ")?.toISOString(),
      "2026-12-01T00:00:00.000Z",
    );
    assert.equal(parseCampaignDate("T", ""), null);
    // Loose formats Date would accept, and a time with no zone, are refused.
    assert.equal(parseCampaignDate("T", "1 Dec"), null);
    assert.equal(parseCampaignDate("T", "12/01/2026"), null);
    assert.equal(parseCampaignDate("T", "2026-12-01T00:00:00"), null);
    assert.equal(parseCampaignDate("T", "2026-02-31"), null);
    assert.equal(parseCampaignDate("T", "2026-13-01"), null);
  });

  test("has no end unless one is set", () => {
    assert.equal(
      isInCampaign({ start, end: null }, new Date("2030-01-01T00:00:00Z")),
      true,
    );
  });
});

describe("names", () => {
  test("public lists show a first name and last initial, or a masked tag", () => {
    assert.equal(publicName({ name: "Ada Chioma Obi" }), "Ada O.");
    assert.equal(publicName({ name: "Ada" }), "Ada");
    assert.equal(publicName({ name: " ", jumpaTag: "adaobi" }), "@ad***");
    assert.equal(publicName(null), "Jumpa user");
  });

  test("notifications use the first name, else the tag", () => {
    assert.equal(firstName({ name: "Ada Obi" }), "Ada");
    assert.equal(firstName({ jumpaTag: "adaobi" }), "@adaobi");
    assert.equal(firstName({}), null);
  });
});

test("formatRewardNaira shows whole naira", () => {
  assert.equal(formatRewardNaira(500), "₦500");
  assert.equal(formatRewardNaira(12500), "₦12,500");
});

test("claim references are recognised by prefix", () => {
  assert.equal(isReferralClaimReference("rclm_abc"), true);
  assert.equal(isReferralClaimReference("tx_abc"), false);
  assert.equal(isReferralClaimReference(null), false);
});
