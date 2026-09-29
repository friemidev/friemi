import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  createDrawGuessState,
  getChainActor,
  getChainStageCount,
  getDrawGuessViewerState,
  startDrawGuessGame,
  validateDrawGuessWord,
} from "./drawGuessEngine";

test("manual words reject hidden characters, links, contact data, and blocked phrases", () => {
  assert.equal(validateDrawGuessWord("  热气球  ", 12, 2), "热气球");
  assert.equal(validateDrawGuessWord("café au lait", 40), "café au lait");
  assert.equal(validateDrawGuessWord("a\u200bb", 12, 2), null);
  assert.equal(validateDrawGuessWord("www.example", 40), null);
  assert.equal(validateDrawGuessWord("12345678", 40), null);
  assert.equal(validateDrawGuessWord("去死", 12, 2), null);
});

test("each relay ends with another player's guess for 5–8 seats", () => {
  for (let count = 5; count <= 8; count += 1) {
    const finalStage = getChainStageCount(count);
    assert.equal(finalStage % 2, 0);
    assert.ok(finalStage < count);
    for (let owner = 0; owner < count; owner += 1) {
      const actors = Array.from({ length: finalStage }, (_, index) => getChainActor(owner, index + 1, count));
      assert.equal(new Set(actors).size, actors.length);
      assert.ok(!actors.includes(owner));
      assert.notEqual(getChainActor(owner, finalStage, count), owner);
    }
  }
});

test("a guesser never receives the classic answer before reveal", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3), 1_000, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: started.state.options[0] }, 0, 3, 2_000, "zh-CN");
  assert.ok(!("error" in selected));
  const artist = getDrawGuessViewerState(selected.state, 0, 3);
  const guesser = getDrawGuessViewerState(selected.state, 1, 3);
  if (!("answer" in artist) || !("answer" in guesser)) throw new Error("Wrong viewer shape");
  assert.equal(artist.answer, selected.state.options[0]);
  assert.equal(guesser.answer, null);
  assert.deepEqual(guesser.options, []);
});

test("correct classic guesses score earlier players higher and count the artist once", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3), 1_000, "en");
  if (!started.state) throw new Error("Game did not start");
  const answer = started.state.options[0];
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: answer }, 0, 3, 2_000, "en");
  const first = applyDrawGuessAction(selected.state, { type: "GUESS", value: answer }, 1, 3, 3_000, "en");
  const second = applyDrawGuessAction(first.state, { type: "GUESS", value: answer }, 2, 3, 30_000, "en");
  assert.ok(!("error" in first) && first.correct);
  assert.ok(!("error" in second) && second.correct);
  assert.ok(first.points! > second.points!);
  assert.equal(second.state.scores[0], 100);
  assert.equal(second.state.phase, "TURN_REVEAL");
  assert.equal(advanceDrawGuessGame(second.state, 3, 40_000, "en").turnIndex, 1);
});

test("two-player classic alternates artist and guesser, then finishes with correct scores", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 2), 1_000, "en");
  if (!started.state) throw new Error("Game did not start");
  const firstAnswer = started.state.options[0];
  const firstChoice = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: firstAnswer }, 0, 2, 2_000, "en");
  const firstViewer = getDrawGuessViewerState(firstChoice.state, 1, 2);
  assert.ok("answer" in firstViewer);
  assert.equal(firstViewer.answer, null);
  const firstGuess = applyDrawGuessAction(firstChoice.state, { type: "GUESS", value: firstAnswer }, 1, 2, 3_000, "en");
  assert.ok(!("error" in firstGuess) && firstGuess.correct);
  assert.equal(firstGuess.state.phase, "TURN_REVEAL");

  const secondTurn = advanceDrawGuessGame(firstGuess.state, 2, 8_000, "en");
  assert.equal(secondTurn.turnIndex, 1);
  const secondAnswer = secondTurn.options[0];
  const secondChoice = applyDrawGuessAction(secondTurn, { type: "CHOOSE_WORD", value: secondAnswer }, 1, 2, 9_000, "en");
  const secondGuess = applyDrawGuessAction(secondChoice.state, { type: "GUESS", value: secondAnswer }, 0, 2, 10_000, "en");
  assert.ok(!("error" in secondGuess) && secondGuess.correct);
  const finished = advanceDrawGuessGame(secondGuess.state, 2, 15_000, "en");
  assert.equal(finished.phase, "FINISHED");
  assert.deepEqual(finished.scores, [298, 298]);
});

test("a player cannot flood guesses in one second", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "DRAW_GUESS";
  state.answer = "giraffe";
  state.deadlineAt = new Date(60_000).toISOString();
  const wrong = applyDrawGuessAction(state, { type: "GUESS", value: "cat" }, 1, 3, 1_000, "en");
  assert.ok(!("error" in wrong));
  const tooFast = applyDrawGuessAction(wrong.state, { type: "GUESS", value: "giraffe" }, 1, 3, 1_500, "en");
  assert.equal("error" in tooFast ? tooFast.error : null, "TOO_FAST");
  const later = applyDrawGuessAction(wrong.state, { type: "GUESS", value: "giraffe" }, 1, 3, 2_000, "en");
  assert.ok(!("error" in later) && later.correct);
});

test("classic live ink keeps a recoverable draft without exposing the answer", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "DRAW_GUESS";
  state.answer = "giraffe";
  state.deadlineAt = new Date(60_000).toISOString();
  const partial = { color: "#123456", width: 4, points: [[0.1, 0.2], [0.3, 0.4]] as [number, number][] };
  const saved = applyDrawGuessAction(state, { type: "SAVE_CLASSIC_DRAFT", strokes: [partial] }, 0, 3, 1_000, "en");
  assert.ok(!("error" in saved));
  assert.deepEqual(saved.state.drawings[0], [partial]);
  assert.equal("error" in applyDrawGuessAction(state, { type: "SAVE_CLASSIC_DRAFT", strokes: [partial] }, 1, 3, 1_000, "en"), true);
  const viewer = getDrawGuessViewerState(saved.state, 1, 3);
  assert.ok("drawing" in viewer && "answer" in viewer);
  assert.deepEqual(viewer.drawing, [partial]);
  assert.equal(viewer.answer, null);
  const cleared = applyDrawGuessAction(saved.state, { type: "SAVE_CLASSIC_DRAFT", strokes: [] }, 0, 3, 2_000, "en");
  assert.ok(!("error" in cleared));
  assert.deepEqual(cleared.state.drawings[0], []);
});

test("a new classic turn resets the ink sequence", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "TURN_REVEAL";
  state.deadlineAt = new Date(5_000).toISOString();
  state.inkSeq = 17;
  const next = advanceDrawGuessGame(state, 3, 5_000, "en");
  assert.equal(next.turnIndex, 1);
  assert.equal(next.inkSeq, 0);
});

test("a late relay command cannot be applied to the next phase", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5), 0, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  const late = applyDrawGuessAction(started.state, { type: "SUBMIT_STEP", value: "过期的词", strokes: [{ color: "#123456", width: 4, points: [[0.2, 0.3]] }] }, 0, 5, 21_000, "zh-CN");
  assert.equal("error" in late ? late.error : null, "PHASE_ENDED");
  assert.equal(late.state.phase, "CHAIN_STEP");
  assert.deepEqual(late.state.chains[0][0], { kind: "WORD", seat: 0, system: true, value: "长颈鹿" });
  assert.equal(late.state.chains[4][1], undefined);
});

test("relay task reveals only the prior step and votes remain private until close", () => {
  const state = createDrawGuessState("CHAIN", 5);
  state.phase = "CHAIN_STEP";
  state.chainStage = 2;
  state.deadlineAt = new Date(50_000).toISOString();
  state.chains[0] = [
    { kind: "WORD", seat: 0, system: false, value: "secret start" },
    { kind: "DRAWING", seat: 1, system: false, value: [{ color: "#123456", width: 4, points: [[0.2, 0.3]] }] },
  ];
  const actor = getDrawGuessViewerState(state, 2, 5);
  if (!("task" in actor)) throw new Error("Wrong viewer shape");
  assert.equal(actor.task?.previous?.kind, "DRAWING");
  assert.equal("chains" in actor, false);
  state.phase = "REVEAL_VOTE";
  state.votes["0"] = { "1": true };
  const reveal = getDrawGuessViewerState(state, 2, 5);
  if (!("voteCounts" in reveal)) throw new Error("Wrong viewer shape");
  assert.equal(reveal.voteCounts, null);
  assert.equal("votes" in reveal, false);
});

test("five-player relay completes, votes, awards drawings, and freezes scores", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  let state = started.state;
  let now = 100;
  for (let owner = 0; owner < 5; owner += 1) {
    const result = applyDrawGuessAction(state, { type: "SUBMIT_STEP", value: `word${owner}` }, owner, 5, now++, "en");
    assert.ok(!("error" in result));
    state = result.state;
  }
  for (let stage = 1; stage <= 4; stage += 1) {
    for (let owner = 0; owner < 5; owner += 1) {
      const actor = getChainActor(owner, stage, 5);
      const action = stage % 2
        ? { type: "SUBMIT_STEP" as const, strokes: [{ color: "#123456", width: 4, points: [[0.2, 0.3] as [number, number]] }] }
        : { type: "SUBMIT_STEP" as const, value: `word${owner}` };
      const result = applyDrawGuessAction(state, action, actor, 5, now++, "en");
      assert.ok(!("error" in result));
      state = result.state;
    }
  }
  assert.equal(state.phase, "REVEAL_VOTE");
  for (let owner = 0; owner < 5; owner += 1) {
    for (let voter = 0; voter < 5; voter += 1) {
      const result = applyDrawGuessAction(state, { type: "VOTE", owner, value: true }, voter, 5, now++, "en");
      assert.ok(!("error" in result));
      state = result.state;
    }
  }
  assert.equal(state.phase, "AUTHOR_PICK");
  for (let owner = 0; owner < 5; owner += 1) {
    const result = applyDrawGuessAction(state, { type: "PICK", owner, step: 1 }, owner, 5, now++, "en");
    assert.ok(!("error" in result));
    state = result.state;
  }
  assert.equal(state.phase, "FINISHED");
  assert.deepEqual(state.scores, [320, 320, 320, 320, 320]);
});

test("Preview two-person relay uses a third system seat without self-guessing", () => {
  const count = 3;
  const botSeat = 2;
  for (let owner = 0; owner < count; owner += 1) {
    assert.notEqual(getChainActor(owner, getChainStageCount(count), count), owner);
  }
  const initial = createDrawGuessState("CHAIN", count);
  initial.practiceBotSeat = botSeat;
  const started = startDrawGuessGame(initial, 0, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  let state = advanceDrawGuessGame(started.state, count, 1, "zh-CN");
  assert.equal(state.chains[botSeat][0].system, true);
  assert.equal(state.phase, "CHAIN_WORD");
  for (let seat = 0; seat < 2; seat += 1) {
    const submitted = applyDrawGuessAction(state, { type: "SUBMIT_STEP", value: `词语${seat}` }, seat, count, 100 + seat, "zh-CN");
    assert.ok(!("error" in submitted));
    state = submitted.state;
  }
  assert.equal(state.phase, "CHAIN_STEP");
  assert.equal(state.chainStage, 1);
  assert.equal(state.chains[1][1].system, true);
  const stroke = { color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] };
  for (let seat = 0; seat < 2; seat += 1) {
    const task = getDrawGuessViewerState(state, seat, count);
    assert.ok("task" in task && task.task?.kind === "DRAWING");
    const submitted = applyDrawGuessAction(state, { type: "SUBMIT_STEP", strokes: [stroke] }, seat, count, 200 + seat, "zh-CN");
    assert.ok(!("error" in submitted));
    state = submitted.state;
  }
  assert.equal(state.chainStage, 2);
  assert.equal(state.chains[0][2].system, true);
  for (let seat = 0; seat < 2; seat += 1) {
    const task = getDrawGuessViewerState(state, seat, count);
    assert.ok("task" in task && task.task?.kind === "WORD");
    assert.notEqual(task.task.owner, seat);
    const submitted = applyDrawGuessAction(state, { type: "SUBMIT_STEP", value: `猜词${seat}` }, seat, count, 300 + seat, "zh-CN");
    assert.ok(!("error" in submitted));
    state = submitted.state;
  }
  assert.equal(state.phase, "REVEAL_VOTE");
  for (let owner = 0; owner < count; owner += 1) {
    for (let seat = 0; seat < 2; seat += 1) {
      const voted = applyDrawGuessAction(state, { type: "VOTE", owner, value: true }, seat, count, 400 + owner * 2 + seat, "zh-CN");
      assert.ok(!("error" in voted));
      state = voted.state;
    }
  }
  assert.equal(state.phase, "AUTHOR_PICK");
  assert.ok(Object.values(state.matchResults).every(Boolean));
  const picked = applyDrawGuessAction(state, { type: "PICK", owner: 0, step: 1 }, 0, count, 500, "zh-CN");
  assert.ok(!("error" in picked));
  state = picked.state;
  assert.equal(state.phase, "FINISHED");
  assert.equal(state.scores[botSeat], 0);
  assert.equal(state.picks[String(botSeat)], undefined);
});
