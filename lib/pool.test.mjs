// Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { pickSlot, points, DEFAULT_SCORING, posFromCode } from "./pool.ts";

test("pickSlot: 7 forward slots take any C/W, 3 D slots take D", () => {
  assert.equal(pickSlot("C", []), "F1");
  assert.equal(pickSlot("W", ["F1"]), "F2");
  assert.equal(pickSlot("D", ["F1"]), "D1");
  const forwardsFull = ["F1", "F2", "F3", "F4", "F5", "F6", "F7"];
  assert.equal(pickSlot("C", forwardsFull), null);
  assert.equal(pickSlot("D", forwardsFull), "D1");
  assert.equal(pickSlot("D", ["D1", "D2", "D3"]), null);
  assert.equal(pickSlot("W", ["D1", "D2", "D3"]), "F1");
});

test("points uses scoring and tolerates missing stats", () => {
  assert.equal(points({ g: 10, a: 5 }, DEFAULT_SCORING), 15);
  assert.equal(points({ g: 2, a: 3 }, { g: 2, a: 1 }), 7);
  assert.equal(points(null, DEFAULT_SCORING), 0);
});

test("posFromCode maps wingers and drops goalies", () => {
  assert.equal(posFromCode("L"), "W");
  assert.equal(posFromCode("R"), "W");
  assert.equal(posFromCode("D"), "D");
  assert.equal(posFromCode("G"), null);
});
