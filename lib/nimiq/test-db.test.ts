import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTestDatabase } from "./test-db";

test("tests refuse any database not named as a test database", () => {
  assert.throws(() => assertTestDatabase("mongodb://127.0.0.1:27017/jumpa"));
  assert.throws(() => assertTestDatabase("mongodb://127.0.0.1:27017"));
  assert.doesNotThrow(() =>
    assertTestDatabase("mongodb://127.0.0.1:27017/jumpa_nimiq_test"),
  );
});
