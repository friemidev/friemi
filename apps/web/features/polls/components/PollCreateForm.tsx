"use client";

import { useActionState, useState } from "react";
import { CirclePlus, Loader2, Trash2 } from "lucide-react";
import {
  createActivityPollAction,
  type PollActionState,
} from "../actions/pollActions";
import { getPollCopy } from "../copy";
import {
  DEFAULT_POLL_RESULT_VISIBILITY,
  DEFAULT_POLL_VOTER_VISIBILITY,
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
} from "../pollRules";

const initialState: PollActionState = {};

export function PollCreateForm({
  activityId,
  locale,
}: {
  activityId: string;
  locale: string;
}) {
  const copy = getPollCopy(locale);
  const [state, action, pending] = useActionState(
    createActivityPollAction,
    initialState,
  );
  const [kind, setKind] = useState<"SINGLE_CHOICE" | "MULTIPLE_CHOICE">(
    "SINGLE_CHOICE",
  );
  const [options, setOptions] = useState(() =>
    Array.from({ length: MIN_POLL_OPTIONS }, () => ""),
  );

  return (
    <form action={action} className="space-y-5">
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      <section className="space-y-4 border-b border-[#E8E5D8] pb-5">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[#1D1D1B]">
            {copy.question}
          </span>
          <input
            autoFocus
            className="min-h-12 w-full rounded-lg border border-[#D8D7C5] bg-[#FEFFF9] px-3 text-base font-semibold text-[#1D1D1B] outline-none transition placeholder:text-[#92978F] focus:border-[#369758] focus:ring-2 focus:ring-[#369758]/15"
            maxLength={120}
            name="question"
            placeholder={copy.questionPlaceholder}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[#1D1D1B]">
            {copy.description}
          </span>
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border border-[#D8D7C5] bg-[#FEFFF9] px-3 py-3 text-sm text-[#1D1D1B] outline-none transition placeholder:text-[#92978F] focus:border-[#369758] focus:ring-2 focus:ring-[#369758]/15"
            maxLength={500}
            name="description"
            placeholder={copy.descriptionPlaceholder}
          />
        </label>
      </section>

      <section className="space-y-4 border-b border-[#E8E5D8] pb-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F3F5EE] p-1">
          {(["SINGLE_CHOICE", "MULTIPLE_CHOICE"] as const).map((value) => (
            <label
              className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md text-sm font-bold transition ${
                kind === value
                  ? "bg-[#156240] text-white shadow-sm"
                  : "text-[#607268]"
              }`}
              key={value}
            >
              <input
                checked={kind === value}
                className="sr-only"
                name="kind"
                onChange={() => setKind(value)}
                type="radio"
                value={value}
              />
              {value === "SINGLE_CHOICE" ? copy.single : copy.multiple}
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1D1D1B]">{copy.options}</h2>
            <span className="text-xs font-semibold text-[#7C827A]">
              {options.length}/{MAX_POLL_OPTIONS}
            </span>
          </div>
          <div className="overflow-hidden border-y border-[#E3DFD0] bg-white">
            {options.map((option, index) => (
              <div
                className={`flex min-h-12 items-center gap-2 px-1 ${
                  index > 0 ? "border-t border-[#EEEBDD]" : ""
                }`}
                key={index}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-xs font-black text-[#156240]">
                  {index + 1}
                </span>
                <input
                  className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-semibold outline-none placeholder:text-[#92978F]"
                  maxLength={80}
                  name="option"
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((value, optionIndex) =>
                        optionIndex === index ? event.target.value : value,
                      ),
                    )
                  }
                  placeholder={`${copy.option} ${index + 1}`}
                  required={index < MIN_POLL_OPTIONS}
                  value={option}
                />
                {options.length > MIN_POLL_OPTIONS ? (
                  <button
                    aria-label={`${copy.option} ${index + 1}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#A34242] transition hover:bg-[#FFF0ED]"
                    onClick={() =>
                      setOptions((current) =>
                        current.filter(
                          (_, optionIndex) => optionIndex !== index,
                        ),
                      )
                    }
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {options.length < MAX_POLL_OPTIONS ? (
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold text-[#156240] transition hover:bg-[#F2F8F3]"
              onClick={() => setOptions((current) => [...current, ""])}
              type="button"
            >
              <CirclePlus className="h-4 w-4" />
              {copy.newOption}
            </button>
          ) : null}
        </div>

        {kind === "MULTIPLE_CHOICE" ? (
          <label className="flex items-center justify-between gap-4 border-t border-[#EEEBDD] pt-4 text-sm font-bold text-[#1D1D1B]">
            {copy.maxSelections}
            <input
              className="h-10 w-20 rounded-lg border border-[#D8D7C5] px-3 text-center outline-none focus:border-[#369758]"
              defaultValue={Math.min(2, options.length)}
              max={options.length}
              min={1}
              name="maxSelections"
              type="number"
            />
          </label>
        ) : null}
      </section>

      <section className="space-y-3">
        <label className="block space-y-2 text-sm font-bold text-[#1D1D1B]">
          <span>{copy.deadlineOptional}</span>
          <input
            className="min-h-11 w-full rounded-lg border border-[#D8D7C5] bg-white px-3 font-medium outline-none focus:border-[#369758]"
            name="closesAt"
            type="datetime-local"
          />
        </label>
        <label className="block space-y-2 text-sm font-bold text-[#1D1D1B]">
          <span>{copy.resultVisibility}</span>
          <select
            className="min-h-11 w-full border-0 border-b border-[#D8D7C5] bg-transparent px-1 font-medium outline-none focus:border-[#369758]"
            defaultValue={DEFAULT_POLL_RESULT_VISIBILITY}
            name="resultVisibility"
          >
            <option value="AFTER_VOTE">{copy.resultAfterVote}</option>
            <option value="AFTER_CLOSE">{copy.resultAfterClose}</option>
            <option value="ALWAYS">{copy.resultAlways}</option>
            <option value="ORGANIZER_ONLY">{copy.resultOrganizerOnly}</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm font-bold text-[#1D1D1B]">
          <span>{copy.voterVisibility}</span>
          <select
            className="min-h-11 w-full border-0 border-b border-[#D8D7C5] bg-transparent px-1 font-medium outline-none focus:border-[#369758]"
            defaultValue={DEFAULT_POLL_VOTER_VISIBILITY}
            name="voterVisibility"
          >
            <option value="COUNTS_ONLY">{copy.voterCountsOnly}</option>
            <option value="PARTICIPANTS_VISIBLE">
              {copy.voterParticipants}
            </option>
            <option value="MANAGERS_ONLY">{copy.voterManagersOnly}</option>
          </select>
        </label>
      </section>

      {state.error ? (
        <p className="rounded-lg bg-[#FFF0ED] px-4 py-3 text-sm font-semibold text-[#9D332B]">
          {state.error}
        </p>
      ) : null}

      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.2)] transition hover:bg-[#0F5135] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {copy.createAction}
      </button>
    </form>
  );
}
