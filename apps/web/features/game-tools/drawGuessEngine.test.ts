import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDrawGuessGame,
  applyDrawGuessAction,
  canResetDrawGuessPostgame,
  createDrawGuessState,
  estimateDrawGuessDurationSeconds,
  getDrawGuessClassicHighlight,
  getChainActor,
  getChainStageCount,
  getChainRevealPosition,
  getChainRevealTotalMs,
  getDrawGuessViewerState,
  getDrawGuessVoteCounts,
  isDrawGuessRoundCount,
  isDrawGuessTiming,
  normalizeDrawGuessWordBankWords,
  setDrawGuessSeatManaged,
  startDrawGuessGame,
  type DrawGuessWordBankSnapshot,
  validateDrawGuessWord,
} from "./drawGuessEngine";

const testBank: DrawGuessWordBankSnapshot = {
  id: "test-bank",
  category: "Animals",
  title: "Animal Friends",
  description: null,
  words: ["cat", "dog", "rabbit", "panda", "giraffe", "elephant", "lion"],
};

test("word bank words are nonempty, valid, and unique after normalization", () => {
  assert.deepEqual(normalizeDrawGuessWordBankWords([" cat ", "Dog"]), ["cat", "Dog"]);
  assert.equal(normalizeDrawGuessWordBankWords([]), null);
  assert.equal(normalizeDrawGuessWordBankWords(["cat", "CAT"]), null);
  assert.equal(normalizeDrawGuessWordBankWords(["www.example"]), null);
  assert.equal(normalizeDrawGuessWordBankWords(["a".repeat(21)]), null);
});

test("round settings accept only one to three rounds and estimate both modes", () => {
  assert.equal(isDrawGuessRoundCount(1), true);
  assert.equal(isDrawGuessRoundCount(3), true);
  assert.equal(isDrawGuessRoundCount(0), false);
  assert.equal(isDrawGuessRoundCount(4), false);
  assert.equal(isDrawGuessRoundCount("2"), false);
  const timing = { drawSeconds: 30, guessSeconds: 20 } as const;
  assert.equal(estimateDrawGuessDurationSeconds("CLASSIC", 3, timing, 1), 195);
  assert.equal(estimateDrawGuessDurationSeconds("CHAIN", 5, timing, 2), 539);
});

test("classic runs two complete rounds, keeps scores, then finishes", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 2, testBank, { drawSeconds: 30, guessSeconds: 20 }, 2), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  let state = started.state;
  for (let round = 1; round <= 2; round += 1) {
    for (let turn = 0; turn < 2; turn += 1) {
      state = advanceDrawGuessGame(state, 2, Date.parse(state.deadlineAt!), "en");
      assert.equal(state.phase, "DRAW_GUESS");
      state = advanceDrawGuessGame(state, 2, Date.parse(state.deadlineAt!), "en");
      assert.equal(state.phase, "TURN_REVEAL");
      state = advanceDrawGuessGame(state, 2, Date.parse(state.deadlineAt!), "en");
    }
    if (round === 1) {
      assert.equal(state.phase, "ROUND_BREAK");
      assert.equal(state.gameNumber, 1);
      assert.equal(state.roundIndex, 1);
      state.scores[0] = 42;
      state = advanceDrawGuessGame(state, 2, Date.parse(state.deadlineAt!), "en");
      assert.equal(state.phase, "WORD_SELECT");
      assert.equal(state.gameNumber, 2);
      assert.equal(state.roundIndex, 2);
      assert.equal(state.scores[0], 42);
      assert.deepEqual(state.guesses, {});
      assert.deepEqual(state.drawings, [[], []]);
      assert.deepEqual(getDrawGuessViewerState(state, 0, 2).roundCount, 2);
    }
  }
  assert.equal(state.phase, "FINISHED");
  assert.equal(state.roundIndex, 2);
  assert.equal(state.scores[0], 42);
});

test("relay runs three chains before the final result", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 3, testBank, { drawSeconds: 30, guessSeconds: 20 }, 3), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  let state = started.state;
  for (let round = 1; round <= 3; round += 1) {
    for (const phase of ["CHAIN_WORD", "CHAIN_STEP", "CHAIN_STEP", "MATCH_VOTE", "MATCH_RESULT", "ARTWORK_RESULT"]) {
      assert.equal(state.phase, phase);
      state = advanceDrawGuessGame(state, 3, Date.parse(state.deadlineAt!), "en");
    }
    if (round < 3) {
      assert.equal(state.phase, "ROUND_BREAK");
      assert.equal(state.roundIndex, round);
      state.scores[0] = 20 * round;
      state = advanceDrawGuessGame(state, 3, Date.parse(state.deadlineAt!), "en");
      assert.equal(state.phase, "CHAIN_WORD");
      assert.equal(state.roundIndex, round + 1);
      assert.equal(state.scores[0], 20 * round);
      assert.deepEqual(state.artworkVotes, {});
      assert.deepEqual(state.chains, [[], [], []]);
    }
  }
  assert.equal(state.phase, "FINISHED");
  assert.equal(state.roundIndex, 3);
  assert.equal(state.gameNumber, 3);
  assert.equal(state.scores[0], 40);
});

test("host timing presets are validated and apply to both kinds of relay step", () => {
  assert.equal(isDrawGuessTiming({ drawSeconds: 90, guessSeconds: 40 }), true);
  assert.equal(isDrawGuessTiming({ drawSeconds: 120, guessSeconds: 40 }), false);
  assert.equal(isDrawGuessTiming({ drawSeconds: 60, guessSeconds: 10 }), false);
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5, testBank, { drawSeconds: 90, guessSeconds: 40 }), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const drawing = advanceDrawGuessGame(started.state, 5, 20_000, "en");
  assert.equal(drawing.phase, "CHAIN_STEP");
  assert.equal(drawing.deadlineAt, new Date(110_000).toISOString());
  const guessing = advanceDrawGuessGame(drawing, 5, 110_000, "en");
  assert.equal(guessing.chainStage, 2);
  assert.equal(guessing.deadlineAt, new Date(150_000).toISOString());
  assert.deepEqual(getDrawGuessViewerState(guessing, 0, 5).timing, { drawSeconds: 90, guessSeconds: 40 });
});

test("classic drawing stops at the host deadline while guessing remains open", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank, { drawSeconds: 30, guessSeconds: 20 }), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: started.state.options[0] }, 0, 3, 1_000, "en");
  assert.ok(!("error" in selected));
  assert.equal(selected.state.drawDeadlineAt, new Date(31_000).toISOString());
  assert.equal(selected.state.deadlineAt, new Date(51_000).toISOString());
  const stroke = { color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] };
  assert.ok(!("error" in applyDrawGuessAction(selected.state, { type: "ADD_STROKE", stroke }, 0, 3, 30_999, "en")));
  const lateStroke = applyDrawGuessAction(selected.state, { type: "ADD_STROKE", stroke }, 0, 3, 31_000, "en");
  assert.equal("error" in lateStroke ? lateStroke.error : null, "DRAW_TIME_ENDED");
  const guess = applyDrawGuessAction(selected.state, { type: "GUESS", value: selected.state.answer }, 1, 3, 35_000, "en");
  assert.ok(!("error" in guess) && guess.correct);
  assert.equal(guess.state.phase, "DRAW_GUESS");
  const reveal = advanceDrawGuessGame(guess.state, 3, 51_000, "en");
  assert.equal(reveal.phase, "TURN_REVEAL");
  assert.equal(reveal.deadlineAt, new Date(56_000).toISOString());
});

test("classic reactions stay small, visible, and feed a finished-turn recap", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "DRAW_GUESS";
  state.answer = "cat";
  state.deadlineAt = new Date(60_000).toISOString();
  state.drawings[0] = [{ color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] }];
  const first = applyDrawGuessAction(state, { type: "REACT", kind: "😂" }, 1, 3, 1_000, "en");
  assert.ok(!("error" in first));
  const firstViewer = getDrawGuessViewerState(first.state, 1, 3);
  const waitingViewer = getDrawGuessViewerState(first.state, 2, 3);
  assert.ok("answer" in waitingViewer && "myReactions" in firstViewer && "reactionCounts" in waitingViewer);
  assert.equal(waitingViewer.answer, null);
  assert.deepEqual(firstViewer.myReactions, ["😂"]);
  assert.equal(waitingViewer.reactionCounts["😂"], 1);
  const repeated = applyDrawGuessAction(first.state, { type: "REACT", kind: "😂" }, 1, 3, 3_000, "en");
  assert.equal("error" in repeated ? repeated.error : null, "REACTION_USED");
  const tooSoon = applyDrawGuessAction(first.state, { type: "REACT", kind: "👏" }, 1, 3, 2_000, "en");
  assert.equal("error" in tooSoon ? tooSoon.error : null, "TOO_FAST");
  const second = applyDrawGuessAction(first.state, { type: "REACT", kind: "😂" }, 2, 3, 2_000, "en");
  const guessed = applyDrawGuessAction(second.state, { type: "GUESS", value: "dog" }, 1, 3, 4_000, "en");
  const reveal = advanceDrawGuessGame(guessed.state, 3, 60_000, "en");
  const next = advanceDrawGuessGame(reveal, 3, 65_000, "en");
  assert.deepEqual(next.reactions, []);
  assert.deepEqual(next.reactionUsed, {});
  assert.equal(next.classicChats[0][0].text, "dog");
  const highlight = getDrawGuessClassicHighlight(next);
  assert.equal(highlight?.laughCount, 2);
  assert.deepEqual(highlight?.wrongGuesses, [{ seat: 1, text: "dog", artistSeat: 0, answer: "cat", laughs: 0 }]);
});

test("classic recap ranks the room's funniest guesses and shows their real answers", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.drawings[0] = [{ color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] }];
  state.drawings[1] = [{ color: "#654321", width: 4, points: [[0.1, 0.2], [0.3, 0.4]] }];
  state.classicAnswers = ["cat", "tree"];
  state.classicReactionCounts = { "0": { "😂": 1 } };
  state.classicChats = [
    [{ id: "one", seat: 1, text: "potato cat", correct: false, at: new Date(0).toISOString() }],
    [{ id: "two", seat: 2, text: "flying tree", correct: false, at: new Date(1).toISOString(), laughedBy: [0, 1] }],
  ];
  const highlight = getDrawGuessClassicHighlight(state);
  assert.equal(highlight?.artistSeat, 0);
  assert.deepEqual(highlight?.wrongGuesses.map((guess) => [guess.text, guess.answer, guess.laughs]),
    [["flying tree", "tree", 2], ["potato cat", "cat", 0]]);
});

test("players can laugh at three other players' wrong guesses per turn", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "DRAW_GUESS";
  state.answer = "cat";
  state.deadlineAt = new Date(60_000).toISOString();
  state.drawings[0] = [{ color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] }];
  state.classicChat = ["one1", "two2", "three3", "four4"].map((id) => ({ id, seat: 1, text: id, correct: false, at: new Date(0).toISOString() }));
  let next = state;
  for (const messageId of ["one1", "two2", "three3"]) {
    const result = applyDrawGuessAction(next, { type: "LAUGH_GUESS", messageId }, 0, 3, 1_000, "en");
    assert.ok(!("error" in result));
    next = result.state;
  }
  assert.deepEqual(next.classicChat.slice(0, 3).map((message) => message.laughedBy), [[0], [0], [0]]);
  const repeat = applyDrawGuessAction(next, { type: "LAUGH_GUESS", messageId: "one1" }, 0, 3, 1_000, "en");
  assert.equal("error" in repeat ? repeat.error : null, "REACTION_USED");
  const excess = applyDrawGuessAction(next, { type: "LAUGH_GUESS", messageId: "four4" }, 0, 3, 1_000, "en");
  assert.equal("error" in excess ? excess.error : null, "REACTION_LIMIT");
  const own = applyDrawGuessAction(state, { type: "LAUGH_GUESS", messageId: "one1" }, 1, 3, 1_000, "en");
  assert.equal("error" in own ? own.error : null, "NOT_ALLOWED");
  const reveal = advanceDrawGuessGame(next, 3, 60_000, "en");
  const nextTurn = advanceDrawGuessGame(reveal, 3, 65_000, "en");
  assert.deepEqual(nextTurn.classicChats[0][0].laughedBy, [0]);
  assert.equal(getDrawGuessClassicHighlight(nextTurn)?.wrongGuesses[0]?.laughs, 1);
});

test("classic rounds draw their choices from the room's selected word bank", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank), 0, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  assert.deepEqual(started.state.options, testBank.words.slice(0, 3));
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: "cat" }, 0, 3, 1_000, "zh-CN");
  assert.ok(!("error" in selected));
  const revealed = advanceDrawGuessGame(selected.state, 3, Date.parse(selected.state.deadlineAt!), "zh-CN");
  assert.equal(revealed.phase, "TURN_REVEAL");
  const nextTurn = advanceDrawGuessGame(revealed, 3, Date.parse(revealed.deadlineAt!), "zh-CN");
  assert.equal(nextTurn.phase, "WORD_SELECT");
  assert.deepEqual(nextTurn.options, testBank.words.slice(3, 6));
});

test("relay opening words and automatic timeout words use the selected bank", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5, testBank), 0, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  const viewer = getDrawGuessViewerState(started.state, 0, 5);
  assert.ok("task" in viewer && viewer.task?.kind === "WORD");
  assert.deepEqual("options" in viewer.task ? viewer.task.options : null, testBank.words.slice(0, 3));
  const rejected = applyDrawGuessAction(started.state, { type: "SUBMIT_STEP", value: "umbrella" }, 0, 5, 1_000, "zh-CN");
  assert.equal("error" in rejected ? rejected.error : null, "INVALID_WORD");
  const accepted = applyDrawGuessAction(started.state, { type: "SUBMIT_STEP", value: "cat" }, 0, 5, 1_000, "zh-CN");
  assert.ok(!("error" in accepted));
  const timedOut = advanceDrawGuessGame(accepted.state, 5, 21_000, "zh-CN");
  assert.equal(timedOut.phase, "CHAIN_STEP");
  assert.ok(timedOut.chains.every((chain) => chain[0].kind === "WORD" && testBank.words.includes(chain[0].value)));
});

test("rooms created before word banks retain their original opening-word flow", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5), 0, "zh-CN");
  if (!started.state) throw new Error("Game did not start");
  const viewer = getDrawGuessViewerState(started.state, 0, 5);
  assert.ok("task" in viewer && viewer.task?.kind === "WORD");
  assert.equal("options" in viewer.task, false);
  const submitted = applyDrawGuessAction(started.state, { type: "SUBMIT_STEP", value: "旧房间词语" }, 0, 5, 1_000, "zh-CN");
  assert.ok(!("error" in submitted));
});

test("manual words reject hidden characters, links, contact data, and blocked phrases", () => {
  assert.equal(validateDrawGuessWord("  热气球  ", 12, 2), "热气球");
  assert.equal(validateDrawGuessWord("café au lait", 40), "café au lait");
  assert.equal(validateDrawGuessWord("a\u200bb", 12, 2), null);
  assert.equal(validateDrawGuessWord("www.example", 40), null);
  assert.equal(validateDrawGuessWord("12345678", 40), null);
  assert.equal(validateDrawGuessWord("去死", 12, 2), null);
  assert.equal(validateDrawGuessWord("pute", 20), null);
  assert.equal(validateDrawGuessWord("computer", 20), "computer");
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

test("spectators see public classic drawing and chat without the answer or word choices", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const chosen = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: "cat" }, 0, 3, 1_000, "en");
  const spectator = getDrawGuessViewerState(chosen.state, -1, 3);
  assert.ok("answer" in spectator && "options" in spectator);
  assert.equal(spectator.answer, null);
  assert.deepEqual(spectator.options, []);
  const chain = startDrawGuessGame(createDrawGuessState("CHAIN", 5, testBank), 0, "en");
  if (!chain.state) throw new Error("Game did not start");
  const chainSpectator = getDrawGuessViewerState(chain.state, -1, 5);
  assert.ok("task" in chainSpectator);
  assert.deepEqual(chainSpectator.task, null);
});

test("managed classic artist is skipped and managed guessers do not delay the next turn", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const skipped = setDrawGuessSeatManaged(started.state, 0, true, 3, 1_000, "en");
  assert.equal(skipped.phase, "TURN_REVEAL");
  assert.equal(skipped.scores[0], 0);
  const next = advanceDrawGuessGame(skipped, 3, 2_000, "en");
  assert.equal(next.turnIndex, 1);
  const selected = applyDrawGuessAction(next, { type: "CHOOSE_WORD", value: next.options[0] }, 1, 3, 3_000, "en");
  assert.equal(selected.state.phase, "DRAW_GUESS");
  const guessed = applyDrawGuessAction(selected.state, { type: "GUESS", value: selected.state.answer }, 2, 3, 4_000, "en");
  assert.equal(guessed.state.phase, "TURN_REVEAL");
  assert.equal(guessed.state.scores[0], 0);
  assert.equal(guessed.state.scores[1], 100);
});

test("leaving during a classic guess forfeits points from that turn", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: "cat" }, 0, 3, 1_000, "en");
  const guessed = applyDrawGuessAction(selected.state, { type: "GUESS", value: "cat" }, 1, 3, 2_000, "en");
  assert.ok(guessed.state.scores[1] > 0);
  const managed = setDrawGuessSeatManaged(guessed.state, 1, true, 3, 3_000, "en");
  assert.equal(managed.scores[1], 0);
  assert.equal(managed.guesses["0"]["1"].points, 0);
  assert.equal(managed.phase, "DRAW_GUESS");
  const resumed = setDrawGuessSeatManaged(managed, 1, false, 3, 4_000, "en");
  assert.equal(resumed.scores[1], 0);
});

test("managed relay actor submits a system step and earns no match points", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 5, testBank), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  const managed = setDrawGuessSeatManaged(started.state, 0, true, 5, 1_000, "en");
  assert.equal(managed.chains[0][0].system, true);
  assert.equal("error" in applyDrawGuessAction(managed, { type: "SUBMIT_STEP", value: "cat" }, 0, 5, 2_000, "en") ? "PLAYER_MANAGED" : null, "PLAYER_MANAGED");
  const advanced = advanceDrawGuessGame(managed, 5, 20_000, "en");
  assert.equal(advanced.phase, "CHAIN_STEP");
  assert.equal(advanced.scores[0], 0);
});

test("classic chat shares wrong guesses but hides the winning word until reveal", () => {
  const started = startDrawGuessGame(createDrawGuessState("CLASSIC", 3, testBank), 1_000, "en");
  if (!started.state) throw new Error("Game did not start");
  const selected = applyDrawGuessAction(started.state, { type: "CHOOSE_WORD", value: "cat" }, 0, 3, 2_000, "en");
  const wrong = applyDrawGuessAction(selected.state, { type: "GUESS", value: "dog?" }, 1, 3, 3_000, "en");
  assert.ok(!("error" in wrong) && !wrong.correct);
  const correct = applyDrawGuessAction(wrong.state, { type: "GUESS", value: "cat!" }, 1, 3, 4_100, "en");
  assert.ok(!("error" in correct) && correct.correct);
  const waitingViewer = getDrawGuessViewerState(correct.state, 2, 3);
  if (!("answer" in waitingViewer) || !("chat" in waitingViewer)) throw new Error("Wrong viewer shape");
  assert.equal(waitingViewer.answer, null);
  assert.deepEqual(waitingViewer.chat.map(({ seat, text, correct }) => ({ seat, text, correct })), [
    { seat: 1, text: "dog?", correct: false },
    { seat: 1, text: null, correct: true },
  ]);
  assert.equal(JSON.stringify(waitingViewer.chat).includes("cat"), false);
  const reveal = advanceDrawGuessGame(correct.state, 3, Date.parse(correct.state.deadlineAt!), "en");
  const nextTurn = advanceDrawGuessGame(reveal, 3, Date.parse(reveal.deadlineAt!), "en");
  assert.deepEqual(nextTurn.classicChat, []);
});

test("classic chat rejects unsafe public guesses without adding a bubble", () => {
  const state = createDrawGuessState("CLASSIC", 3);
  state.phase = "DRAW_GUESS";
  state.answer = "giraffe";
  state.deadlineAt = new Date(60_000).toISOString();
  for (const value of ["https://a.co", "hi@example.com", "12345678", "gira\u200bffe", "fuck"]) {
    const result = applyDrawGuessAction(state, { type: "GUESS", value }, 1, 3, 1_000, "en");
    assert.equal("error" in result ? result.error : null, "INVALID_WORD");
    assert.deepEqual(result.state.classicChat, []);
  }
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
  const correctViewer = getDrawGuessViewerState(first.state, 1, 3);
  const waitingViewer = getDrawGuessViewerState(first.state, 2, 3);
  assert.ok("answer" in correctViewer && "answer" in waitingViewer);
  assert.equal(correctViewer.answer, answer);
  assert.equal(waitingViewer.answer, null);
  assert.equal(correctViewer.scores[1], first.points);
  assert.equal(second.state.scores[0], 100);
  assert.equal(second.state.phase, "TURN_REVEAL");
  assert.equal(second.state.deadlineAt, new Date(35_000).toISOString());
  assert.equal(advanceDrawGuessGame(second.state, 3, 34_999, "en").turnIndex, 0);
  assert.equal(advanceDrawGuessGame(second.state, 3, 35_000, "en").turnIndex, 1);
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
  assert.equal(firstGuess.state.deadlineAt, new Date(8_000).toISOString());

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
  assert.equal(wrong.state.classicChat.length, 1);
  const tooFast = applyDrawGuessAction(wrong.state, { type: "GUESS", value: "giraffe" }, 1, 3, 1_500, "en");
  assert.equal("error" in tooFast ? tooFast.error : null, "TOO_FAST");
  assert.equal(tooFast.state.classicChat.length, 1);
  const later = applyDrawGuessAction(wrong.state, { type: "GUESS", value: "giraffe" }, 1, 3, 2_000, "en");
  assert.ok(!("error" in later) && later.correct);
  assert.equal(later.state.classicChat[1].text, null);
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

test("relay word voting hides drawings, then artwork voting shows live selections", () => {
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
  state.chains[0][2] = { kind: "WORD", seat: 2, system: false, value: "final guess" };
  state.phase = "MATCH_VOTE";
  state.votes = { "0": { "1": true } };
  const wordVote = getDrawGuessViewerState(state, 2, 5);
  assert.ok("chains" in wordVote);
  assert.deepEqual(wordVote.chains?.[0].map((step) => step.kind), ["WORD", "WORD"]);
  assert.equal(JSON.stringify(wordVote).includes("#123456"), false);
  state.phase = "ARTWORK_VOTE";
  state.artworkVotes = { "0": { "1": 1 } };
  const reveal = getDrawGuessViewerState(state, 2, 5);
  if (!("voteCounts" in reveal)) throw new Error("Wrong viewer shape");
  assert.deepEqual(reveal.voteCounts?.[0], { yes: 1, no: 0, abstain: 4 });
  assert.deepEqual(reveal.myArtworkVotes, {});
  assert.deepEqual(reveal.artworkVotes, { "0": { "1": 1 } });
  const voter = getDrawGuessViewerState(state, 1, 5);
  assert.ok("myArtworkVotes" in voter);
  assert.deepEqual(voter.myArtworkVotes, { "0": 1 });
});

test("relay waiting count and final artwork pick are visible at the proper stage", () => {
  const state = createDrawGuessState("CHAIN", 5);
  state.phase = "CHAIN_WORD";
  state.chains[0][0] = { kind: "WORD", seat: 0, system: false, value: "cat" };
  const waiting = getDrawGuessViewerState(state, 1, 5);
  assert.equal(waiting.chainSubmittedCount, 1);

  state.phase = "ARTWORK_VOTE";
  state.picks = { "0": 1, "1": 3 };
  const owner = getDrawGuessViewerState(state, 0, 5);
  assert.ok("picks" in owner);
  assert.deepEqual(owner.picks, {});
  state.phase = "FINISHED";
  const finished = getDrawGuessViewerState(state, 0, 5);
  assert.ok("picks" in finished);
  assert.deepEqual(finished.picks, { "0": 1, "1": 3 });
});

test("legacy guess-vote totals exclude the practice helper and managed players", () => {
  const state = createDrawGuessState("CHAIN", 3);
  state.practiceBotSeat = 2;
  state.phase = "FINISHED";
  state.votes["0"] = { "0": true, "1": false, "2": true };
  assert.deepEqual(getDrawGuessVoteCounts(state)[0], { yes: 1, no: 1, abstain: 0 });
  state.managedSeats = [1];
  assert.deepEqual(getDrawGuessVoteCounts(state)[0], { yes: 1, no: 0, abstain: 0 });
});

test("one player returning from results does not reset the shared room", () => {
  assert.equal(canResetDrawGuessPostgame(["host"], ["host", "friend"]), false);
  assert.equal(canResetDrawGuessPostgame(["host", "friend"], ["host", "friend"]), true);
  assert.equal(canResetDrawGuessPostgame(["host", "friend"], ["host", "friend", "spectator"]), false);
  assert.equal(canResetDrawGuessPostgame(["host", "friend"], ["host"]), true);
  assert.equal(canResetDrawGuessPostgame([], []), false);
});

test("a saved relay drawing stays a player artwork when the timer expires", () => {
  const state = createDrawGuessState("CHAIN", 3);
  state.phase = "CHAIN_STEP";
  state.chainStage = 1;
  state.deadlineAt = new Date(5_000).toISOString();
  const drawing = [{ color: "#123456", width: 4, points: [[0.2, 0.3], [0.4, 0.5]] as [number, number][] }];
  state.drafts["0:1"] = drawing;
  const advanced = advanceDrawGuessGame(state, 3, 5_000, "en");
  assert.deepEqual(advanced.chains[0][1], { kind: "DRAWING", seat: 1, system: false, value: drawing });
  assert.deepEqual(advanced.chains[1][1], { kind: "DRAWING", seat: 2, system: true, value: [] });
  advanced.phase = "ARTWORK_VOTE";
  advanced.deadlineAt = new Date(10_000).toISOString();
  advanced.artworkVotes = { "0": { "0": 1 } };
  const settled = advanceDrawGuessGame(advanced, 3, 10_000, "en");
  assert.equal(settled.scores[1], 100);
});

test("relay reveal shares one timed position and resumes after a bounded pause", () => {
  const state = createDrawGuessState("CHAIN", 3);
  state.phase = "CHAIN_REVEAL";
  state.chains = Array.from({ length: 3 }, (_, owner) => [
    { kind: "WORD" as const, seat: owner, system: false, value: `word${owner}` },
    { kind: "DRAWING" as const, seat: (owner + 1) % 3, system: false, value: [] },
    { kind: "WORD" as const, seat: (owner + 2) % 3, system: false, value: `guess${owner}` },
  ]);
  assert.equal(getChainRevealTotalMs(state.chains), 42_000);
  state.chainReveal = { elapsedMs: 0, startedAt: new Date(0).toISOString(), pausedUntil: null };
  state.deadlineAt = new Date(42_000).toISOString();
  assert.deepEqual(getChainRevealPosition(state, 3_000), { owner: 0, step: 1, elapsedMs: 3_000, nextBoundaryMs: 4_000, totalMs: 42_000 });
  const tooEarly = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, 1, 3, 3_000, "en");
  assert.equal("error" in tooEarly ? tooEarly.error : null, "NOT_ALLOWED");
  const paused = applyDrawGuessAction(state, { type: "REVEAL_CONTROL", command: "PAUSE" }, 0, 3, 3_000, "en");
  assert.ok(!("error" in paused));
  assert.deepEqual(getChainRevealPosition(paused.state, 30_000), getChainRevealPosition(paused.state, 3_000));
  assert.equal(paused.state.deadlineAt, new Date(63_000).toISOString());
  const resumed = applyDrawGuessAction(paused.state, { type: "REVEAL_CONTROL", command: "RESUME" }, 0, 3, 30_000, "en");
  assert.ok(!("error" in resumed));
  assert.equal(resumed.state.deadlineAt, new Date(69_000).toISOString());
  const skipped = applyDrawGuessAction(resumed.state, { type: "REVEAL_CONTROL", command: "NEXT" }, 0, 3, 31_000, "en");
  assert.ok(!("error" in skipped));
  assert.deepEqual([getChainRevealPosition(skipped.state, 31_000).owner, getChainRevealPosition(skipped.state, 31_000).step], [1, 1]);
  const earlyVote = applyDrawGuessAction(skipped.state, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, 1, 3, 31_000, "en");
  assert.equal("error" in earlyVote ? earlyVote.error : null, "NOT_ALLOWED");
  const hiddenReaction = applyDrawGuessAction(skipped.state, { type: "CHAIN_REACT", kind: "😂", owner: 2, step: 2 }, 1, 3, 31_100, "en");
  assert.equal("error" in hiddenReaction ? hiddenReaction.error : null, "NOT_ALLOWED");
  const autoResumed = advanceDrawGuessGame(paused.state, 3, 63_000, "en");
  assert.equal(autoResumed.phase, "CHAIN_REVEAL");
  assert.equal(autoResumed.chainReveal?.pausedUntil, null);
  assert.equal(autoResumed.deadlineAt, new Date(102_000).toISOString());
  const voting = advanceDrawGuessGame(autoResumed, 3, 102_000, "en");
  assert.equal(voting.phase, "MATCH_VOTE");
  assert.equal(voting.chainReveal, undefined);
});

test("relay cheers show live presence without revealing unfinished chains or allowing repeat reactions", () => {
  const state = createDrawGuessState("CHAIN", 5);
  state.phase = "CHAIN_WORD";
  state.deadlineAt = new Date(50_000).toISOString();
  state.chains[0][0] = { kind: "WORD", seat: 0, system: false, value: "secret cat" };
  const waiting = applyDrawGuessAction(state, { type: "CHAIN_REACT", kind: "👏", owner: -1, step: -1 }, 0, 5, 1_000, "en");
  assert.ok(!("error" in waiting));
  const other = getDrawGuessViewerState(waiting.state, 1, 5);
  assert.deepEqual(other.chainFinishedSeats, [0]);
  assert.equal(other.chainReactions?.[0]?.kind, "👏");
  assert.equal("chains" in other, false);
  assert.equal(JSON.stringify(other).includes("secret cat"), false);
  const repeated = applyDrawGuessAction(waiting.state, { type: "CHAIN_REACT", kind: "😂", owner: -1, step: -1 }, 0, 5, 2_000, "en");
  assert.equal("error" in repeated ? repeated.error : null, "REACTION_USED");
  const unfinished = applyDrawGuessAction(waiting.state, { type: "CHAIN_REACT", kind: "😂", owner: -1, step: -1 }, 1, 5, 2_000, "en");
  assert.equal("error" in unfinished ? unfinished.error : null, "NOT_ALLOWED");

  const reveal = structuredClone(waiting.state);
  reveal.phase = "ARTWORK_VOTE";
  reveal.chains[0][1] = { kind: "DRAWING", seat: 1, system: false, value: [] };
  const reacted = applyDrawGuessAction(reveal, { type: "CHAIN_REACT", kind: "😮", owner: 0, step: 1 }, 1, 5, 3_000, "en");
  assert.ok(!("error" in reacted));
  const viewer = getDrawGuessViewerState(reacted.state, 2, 5);
  assert.deepEqual(viewer.chainReactions?.map((item) => item.kind), ["😮"]);
  if (!("voteCounts" in viewer)) throw new Error("Wrong viewer shape");
  assert.deepEqual(viewer.voteCounts?.[0], { yes: 0, no: 0, abstain: 5 });
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
  assert.equal(state.phase, "MATCH_VOTE");
  for (let owner = 0; owner < 5; owner += 1) {
    for (let voter = 0; voter < 5; voter += 1) {
      const result = applyDrawGuessAction(state, { type: "VOTE", owner, value: true }, voter, 5, now++, "en");
      assert.ok(!("error" in result));
      state = result.state;
    }
  }
  assert.equal(state.phase, "MATCH_RESULT");
  assert.ok(Object.values(state.matchResults).every(Boolean));
  state = advanceDrawGuessGame(state, 5, Date.parse(state.deadlineAt!), "en");
  now = Date.parse(state.deadlineAt!) - 59_000;
  assert.equal(state.phase, "ARTWORK_VOTE");
  for (let voter = 0; voter < 5; voter += 1) {
    const result = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, voter, 5, now++, "en");
    assert.ok(!("error" in result));
    state = result.state;
  }
  assert.equal(state.phase, "ARTWORK_RESULT");
  assert.ok(Object.values(state.matchResults).every(Boolean));
  assert.deepEqual(state.scores, [180, 280, 180, 180, 180]);
  assert.deepEqual(state.picks, { "0": 1 });
  assert.deepEqual(state.artworkVoterSeats, [0, 1, 2, 3, 4]);
  const resultView = getDrawGuessViewerState(state, 3, 5);
  if (!("artworkVotes" in resultView)) throw new Error("Wrong viewer shape");
  assert.deepEqual(resultView.artworkVotes?.["0"], { "0": 1, "1": 1, "2": 1, "3": 1, "4": 1 });
  assert.deepEqual(resultView.picks, { "0": 1 });
  const scoreSnapshot = [...state.scores];
  state = advanceDrawGuessGame(state, 5, Date.parse(state.deadlineAt!) - 1, "en");
  assert.equal(state.phase, "ARTWORK_RESULT");
  state = advanceDrawGuessGame(state, 5, Date.parse(state.deadlineAt!), "en");
  assert.equal(state.phase, "FINISHED");
  assert.deepEqual(state.scores, scoreSnapshot);
});

test("a word-vote majority decides the match, then all players pick artwork", () => {
  const state = createDrawGuessState("CHAIN", 5);
  state.phase = "MATCH_VOTE";
  state.deadlineAt = new Date(60_000).toISOString();
  state.chains[0] = [
    { kind: "WORD", seat: 0, system: false, value: "Cat" },
    { kind: "DRAWING", seat: 1, system: false, value: [] },
    { kind: "WORD", seat: 2, system: false, value: "kitten" },
    { kind: "DRAWING", seat: 3, system: false, value: [] },
    { kind: "WORD", seat: 4, system: false, value: "moon" },
  ];
  for (let owner = 1; owner < 5; owner += 1) state.votes[String(owner)] = { "0": false, "1": false, "2": false, "3": false, "4": false };
  const prematureArtwork = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, 0, 5, 1_000, "en");
  assert.equal("error" in prematureArtwork ? prematureArtwork.error : null, "NOT_ALLOWED");
  let current = state;
  for (let voter = 0; voter < 5; voter += 1) {
    const result = applyDrawGuessAction(current, { type: "VOTE", owner: 0, value: voter < 3 }, voter, 5, 2_000 + voter, "en");
    assert.ok(!("error" in result));
    current = result.state;
  }
  assert.equal(current.phase, "MATCH_RESULT");
  assert.equal(current.matchResults["0"], true);
  assert.deepEqual(getDrawGuessVoteCounts(current)[0], { yes: 3, no: 2, abstain: 0 });
  current = advanceDrawGuessGame(current, 5, Date.parse(current.deadlineAt!), "en");
  assert.equal(current.phase, "ARTWORK_VOTE");
  const invalidArtwork = applyDrawGuessAction(current, { type: "VOTE_ARTWORK", owner: 0, step: 2 }, 0, 5, Date.parse(current.deadlineAt!) - 59_000, "en");
  assert.equal("error" in invalidArtwork ? invalidArtwork.error : null, "INVALID_ARTWORK");
  let voteTime = Date.parse(current.deadlineAt!) - 58_000;
  for (let voter = 0; voter < 5; voter += 1) {
    const result = applyDrawGuessAction(current, { type: "VOTE_ARTWORK", owner: 0, step: voter < 3 ? 3 : 1 }, voter, 5, voteTime++, "en");
    assert.ok(!("error" in result));
    current = result.state;
  }
  assert.equal(current.phase, "ARTWORK_RESULT");
  assert.equal(current.picks["0"], 3);
  assert.deepEqual(current.scores, [20, 40, 40, 140, 40]);
  current = advanceDrawGuessGame(current, 5, Date.parse(current.deadlineAt!), "en");
  assert.equal(current.phase, "FINISHED");
});

test("identical words without a vote majority earn no match points or artwork prize", () => {
  const state = createDrawGuessState("CHAIN", 3);
  state.phase = "MATCH_VOTE";
  state.deadlineAt = new Date(10_000).toISOString();
  state.chains[0] = [
    { kind: "WORD", seat: 0, system: false, value: "Moon" },
    { kind: "DRAWING", seat: 1, system: false, value: [] },
    { kind: "WORD", seat: 2, system: false, value: "moon" },
  ];
  const result = advanceDrawGuessGame(state, 3, 10_000, "en");
  assert.equal(result.phase, "MATCH_RESULT");
  assert.equal(result.matchResults["0"], false);
  const artwork = advanceDrawGuessGame(result, 3, Date.parse(result.deadlineAt!), "en");
  const resultPhase = advanceDrawGuessGame(artwork, 3, Date.parse(artwork.deadlineAt!), "en");
  assert.equal(resultPhase.phase, "ARTWORK_RESULT");
  const finished = advanceDrawGuessGame(resultPhase, 3, Date.parse(resultPhase.deadlineAt!), "en");
  assert.equal(finished.phase, "FINISHED");
  assert.equal(finished.matchResults["0"], false);
  assert.equal(finished.picks["0"], undefined);
  assert.deepEqual(finished.scores, [0, 0, 0]);
});

test("a tied word vote does not award match points even when the words are identical", () => {
  const state = createDrawGuessState("CHAIN", 4);
  state.phase = "MATCH_VOTE";
  state.deadlineAt = new Date(60_000).toISOString();
  state.chains[0] = [
    { kind: "WORD", seat: 0, system: false, value: "Moon" },
    { kind: "DRAWING", seat: 1, system: false, value: [] },
    { kind: "WORD", seat: 2, system: false, value: "moon" },
  ];
  for (let owner = 1; owner < 4; owner += 1) state.votes[String(owner)] = { "0": false, "1": false, "2": false, "3": false };
  let current = state;
  for (let seat = 0; seat < 4; seat += 1) {
    const result = applyDrawGuessAction(current, { type: "VOTE", owner: 0, value: seat < 2 }, seat, 4, 1_000 + seat, "en");
    assert.ok(!("error" in result));
    current = result.state;
  }
  assert.equal(current.phase, "MATCH_RESULT");
  assert.equal(current.matchResults["0"], false);
  assert.deepEqual(getDrawGuessVoteCounts(current)[0], { yes: 2, no: 2, abstain: 0 });
  current.managedSeats = [0];
  assert.deepEqual(current.matchVoterSeats, [0, 1, 2, 3]);
  assert.deepEqual(getDrawGuessVoteCounts(current)[0], { yes: 2, no: 2, abstain: 0 });
});

test("each player has one artwork vote across the round and can change it", () => {
  const state = createDrawGuessState("CHAIN", 4);
  state.phase = "ARTWORK_VOTE";
  state.deadlineAt = new Date(60_000).toISOString();
  state.chains[0] = [
    { kind: "WORD", seat: 0, system: false, value: "Moon" },
    { kind: "DRAWING", seat: 1, system: false, value: [] },
  ];
  state.chains[1] = [
    { kind: "WORD", seat: 1, system: false, value: "Cat" },
    { kind: "DRAWING", seat: 2, system: false, value: [] },
  ];
  let current = state;
  for (const [seat, owner] of [[0, 0], [0, 1], [1, 0], [2, 1], [3, 0]]) {
    const result = applyDrawGuessAction(current, { type: "VOTE_ARTWORK", owner, step: 1 }, seat, 4, 1_000 + seat, "en");
    assert.ok(!("error" in result));
    current = result.state;
    if (seat === 0 && owner === 1) {
      assert.equal(current.artworkVotes?.["0"]?.["0"], undefined);
      const viewer = getDrawGuessViewerState(current, 0, 4);
      assert.ok("myArtworkVotes" in viewer);
      assert.deepEqual(viewer.myArtworkVotes, { "1": 1 });
    }
  }
  assert.equal(current.phase, "ARTWORK_RESULT");
  assert.deepEqual(current.picks, { "0": 1 });
  assert.deepEqual(current.scores, [0, 100, 0, 0]);
  const lateVote = applyDrawGuessAction(current, { type: "VOTE_ARTWORK", owner: 1, step: 1 }, 0, 4, Date.parse(current.deadlineAt!) - 1, "en");
  assert.equal("error" in lateVote ? lateVote.error : null, "NOT_ALLOWED");
  current = advanceDrawGuessGame(current, 4, Date.parse(current.deadlineAt!), "en");
  assert.equal(current.phase, "FINISHED");
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
  assert.equal(state.phase, "MATCH_VOTE");
  let matchTime = Date.parse(state.deadlineAt!) - 59_000;
  for (let owner = 0; owner < count; owner += 1) {
    for (let seat = 0; seat < 2; seat += 1) {
      const voted = applyDrawGuessAction(state, { type: "VOTE", owner, value: true }, seat, count, matchTime++, "zh-CN");
      assert.ok(!("error" in voted));
      state = voted.state;
    }
  }
  assert.equal(state.phase, "MATCH_RESULT");
  assert.ok(Object.values(state.matchResults).every(Boolean));
  assert.deepEqual(getDrawGuessVoteCounts(state)[0], { yes: 2, no: 0, abstain: 0 });
  state = advanceDrawGuessGame(state, count, Date.parse(state.deadlineAt!), "zh-CN");
  assert.equal(state.phase, "ARTWORK_VOTE");
  let voteTime = Date.parse(state.deadlineAt!) - 59_000;
  for (let seat = 0; seat < 2; seat += 1) {
    const voted = applyDrawGuessAction(state, { type: "VOTE_ARTWORK", owner: 0, step: 1 }, seat, count, voteTime++, "zh-CN");
    assert.ok(!("error" in voted));
    state = voted.state;
  }
  assert.equal(state.phase, "ARTWORK_RESULT");
  assert.ok(Object.values(state.matchResults).every(Boolean));
  assert.equal(state.scores[botSeat], 0);
  assert.equal(state.picks[String(botSeat)], undefined);
  state = advanceDrawGuessGame(state, count, Date.parse(state.deadlineAt!), "zh-CN");
  assert.equal(state.phase, "FINISHED");
});

test("eight-player relay with timeouts completes three rounds without waiting forever", () => {
  const started = startDrawGuessGame(createDrawGuessState("CHAIN", 8, testBank, { drawSeconds: 30, guessSeconds: 20 }, 3), 0, "en");
  if (!started.state) throw new Error("Game did not start");
  let state = started.state;
  const seen = new Set<string>();
  for (let safety = 0; safety < 60 && state.phase !== "FINISHED"; safety += 1) {
    seen.add(state.phase);
    assert.ok(state.deadlineAt, `Missing deadline in ${state.phase}`);
    state = advanceDrawGuessGame(state, 8, Date.parse(state.deadlineAt), "en");
  }
  assert.equal(state.phase, "FINISHED");
  assert.equal(state.gameNumber, 3);
  assert.ok(seen.has("MATCH_VOTE"));
  assert.ok(seen.has("MATCH_RESULT"));
  assert.ok(seen.has("ARTWORK_RESULT"));
  assert.ok(seen.has("ROUND_BREAK"));
  assert.deepEqual(state.scores, Array(8).fill(0));
});
