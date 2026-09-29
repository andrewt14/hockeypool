// Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { pickSlot, points, DEFAULT_SCORING, posFromCode } from "./pool.ts";

test("pickSlot fills position slots, then utility, then nothing", () => {
  assert.equal(pickSlot("C", []), "C1");
  assert.equal(pickSlot("C", ["C1"]), "C2");
  assert.equal(pickSlot("C", ["C1", "C2"]), "U1");
  assert.equal(pickSlot("D", ["D1", "D2", "U1"]), "U2");
  assert.equal(pickSlot("W", ["W1", "W2", "U1", "U2"]), null);
  assert.equal(pickSlot("G", []), "G1");
  assert.equal(pickSlot("G", ["G1"]), null); // goalies never go in utility
});

test("points uses scoring and tolerates missing stats", () => {
  assert.equal(points({ g: 10, a: 5 }, DEFAULT_SCORING), 15);
  assert.equal(points({ w: 3, so: 1, otl: 2 }, DEFAULT_SCORING), 11);
  assert.equal(points(null, DEFAULT_SCORING), 0);
});

test("posFromCode maps wingers", () => {
  assert.equal(posFromCode("L"), "W");
  assert.equal(posFromCode("R"), "W");
  assert.equal(posFromCode("D"), "D");
});
