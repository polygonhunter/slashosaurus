import { describe, expect, it } from "vitest";
import { detectTrigger } from "../src/core/trigger";

describe("detectTrigger", () => {
	it("fires at the start of a line", () => {
		expect(detectTrigger("/", "/")).toEqual({ startCh: 0, query: "" });
	});

	it("fires after whitespace with the typed query", () => {
		expect(detectTrigger("some text /wa", "/")).toEqual({ startCh: 10, query: "wa" });
	});

	it("fires after a tab", () => {
		expect(detectTrigger("\t/h2", "/")).toEqual({ startCh: 1, query: "h2" });
	});

	it("does not fire in the middle of a word", () => {
		expect(detectTrigger("word/", "/")).toBeNull();
	});

	it("does not fire inside URLs or paths", () => {
		expect(detectTrigger("https://example.com/", "/")).toBeNull();
		expect(detectTrigger("see /usr/local", "/")).toBeNull();
	});

	it("closes once the query hits non-word characters", () => {
		expect(detectTrigger("/note!", "/")).toBeNull();
		expect(detectTrigger("/a b", "/")).toBeNull();
	});

	it("allows dashes and unicode letters in the query", () => {
		expect(detectTrigger("/to-do", "/")).toEqual({ startCh: 0, query: "to-do" });
		expect(detectTrigger("/über", "/")).toEqual({ startCh: 0, query: "über" });
	});

	it("supports a custom trigger character, escaped for regex", () => {
		expect(detectTrigger(";wa", ";")).toEqual({ startCh: 0, query: "wa" });
		expect(detectTrigger(".note", ".")).toEqual({ startCh: 0, query: "note" });
		expect(detectTrigger("a.b", ".")).toBeNull();
	});

	it("matches the last trigger on the line", () => {
		expect(detectTrigger("/first /second", "/")).toEqual({ startCh: 7, query: "second" });
	});

	it("returns null for an empty trigger character", () => {
		expect(detectTrigger("/x", "")).toBeNull();
	});

	it("handles the fast path on long lines", () => {
		const long = "x".repeat(5000);
		expect(detectTrigger(long, "/")).toBeNull();
		expect(detectTrigger(`${long} /wa`, "/")).toEqual({ startCh: 5001, query: "wa" });
		expect(detectTrigger(`${long}/wa`, "/")).toBeNull();
		expect(detectTrigger(`/wa ${long}`, "/")).toBeNull();
	});

	it("works with a two-unit emoji trigger", () => {
		expect(detectTrigger("ab 🦖no", "🦖")).toEqual({ startCh: 3, query: "no" });
		expect(detectTrigger("🦖", "🦖")).toEqual({ startCh: 0, query: "" });
		expect(detectTrigger("a🦖", "🦖")).toBeNull();
	});

	it("keeps the full scan for triggers that are query characters", () => {
		// The last "-" sits inside the query; the trigger is the first one.
		expect(detectTrigger("-to-do", "-")).toEqual({ startCh: 0, query: "to-do" });
		expect(detectTrigger("text x1", "x")).toEqual({ startCh: 5, query: "1" });
	});

	it("accepts any non-space language in loose mode", () => {
		expect(detectTrigger("/c++", "/", true)).toEqual({ startCh: 0, query: "c++" });
		expect(detectTrigger("> /f#", "/", true)).toEqual({ startCh: 2, query: "f#" });
		expect(detectTrigger("/c+", "/")).toBeNull();
		// Whitespace and backticks still end it; so does a second trigger.
		expect(detectTrigger("/c +", "/", true)).toBeNull();
		expect(detectTrigger("/c`", "/", true)).toBeNull();
		expect(detectTrigger("/a/b", "/", true)).toBeNull();
	});

	it("escapes class-special triggers in loose mode", () => {
		expect(detectTrigger("-c++", "-", true)).toEqual({ startCh: 0, query: "c++" });
		expect(detectTrigger("^vb.net", "^", true)).toEqual({ startCh: 0, query: "vb.net" });
		expect(detectTrigger("]x", "]", true)).toEqual({ startCh: 0, query: "x" });
		expect(detectTrigger("\\x", "\\", true)).toEqual({ startCh: 0, query: "x" });
	});
});

