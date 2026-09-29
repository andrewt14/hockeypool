// Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { buildBoxes, points, DEFAULT_SCORING, posFromCode, ROUNDS, BOX_SIZE, slotOf, roundOf, isDefenseRound } from "./pool.ts";

const mk = (id, pos, pts) => ({ id, pos, last: { g: pts, a: 0 } });

test("buildBoxes tiers forwards into rounds 1-10 and defense into 11-14", () => {
  const fwd = Array.from({ length: 105 }, (_, i) => mk(i + 1, i % 2 ? "C" : "W", 200 - i)); // id 1 is best
  const def = Array.from({ length: 45 }, (_, i) => mk(1000 + i, "D", 90 - i));
  const boxes = buildBoxes([...def, ...fwd].reverse(), []);
  assert.equal(boxes.length, ROUNDS);
  assert.deepEqual(boxes[0].map((p) => p.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(boxes[1].map((p) => p.id)[0], 11);
  assert.equal(boxes[9].length, BOX_SIZE); // forwards 91-100; 101+ unused
  assert.ok(boxes.slice(0, 10).flat().every((p) => p.pos !== "D"));
  assert.deepEqual(boxes[10].map((p) => p.id)[0], 1000);
  assert.ok(boxes.slice(10).flat().every((p) => p.pos === "D"));
  assert.equal(new Set(boxes.flat().map((p) => p.id)).size, boxes.flat().length); // nobody in two boxes
});

test("ties break by id so boxes are stable", () => {
  const boxes = buildBoxes([mk(5, "C", 10), mk(3, "C", 10)], []);
  assert.deepEqual(boxes[0].map((p) => p.id), [3, 5]);
});

test("ranking list overrides points; unranked players fall in after", () => {
  const ps = [mk(1, "C", 100), mk(2, "W", 50), mk(3, "C", 90), mk(4, "D", 10), mk(5, "D", 60)];
  const boxes = buildBoxes(ps, [2, 4, 3]); // 2 ranked above 3, 1 unranked
  assert.deepEqual(boxes[0].map((p) => p.id), [2, 3, 1]);
  assert.deepEqual(boxes[10].map((p) => p.id), [4, 5]);
});

test("slot/round helpers", () => {
  assert.equal(slotOf(3), "R3");
  assert.equal(roundOf("R14"), 14);
  assert.equal(isDefenseRound(10), false);
  assert.equal(isDefenseRound(11), true);
});

test("points uses scoring and tolerates missing stats", () => {
  assert.equal(points({ g: 10, a: 5 }, DEFAULT_SCORING), 15);
  assert.equal(points({ g: 2, a: 3 }, { g: 2, a: 1 }), 7);
  assert.equal(points(null, DEFAULT_SCORING), 0);
});

test("posFromCode maps wingers and drops goalies", () => {
  assert.equal(posFromCode("L"), "W");
  assert.equal(posFromCode("D"), "D");
  assert.equal(posFromCode("G"), null);
});
