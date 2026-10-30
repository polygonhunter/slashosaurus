import { describe, expect, it } from "vitest";
import { formatDate } from "../src/core/dateformat";

// 2020-01-01 was a Wednesday; 15:05:07 exercises padding and 12h logic.
const date = new Date(2020, 0, 1, 15, 5, 7);

describe("formatDate", () => {
	it("formats the ISO default", () => {
		expect(formatDate(date, "YYYY-MM-DD")).toBe("2020-01-01");
	});

	it("formats German-style dates", () => {
		expect(formatDate(date, "DD.MM.YYYY")).toBe("01.01.2020");
	});

	it("formats names, unpadded tokens, and two-digit years", () => {
		expect(formatDate(date, "dddd, MMMM D YY")).toBe("Wednesday, January 1 20");
		expect(formatDate(date, "ddd D. MMM")).toBe("Wed 1. Jan");
	});

	it("formats times in 24h and 12h", () => {
		expect(formatDate(date, "HH:mm:ss")).toBe("15:05:07");
		expect(formatDate(date, "h:mm A")).toBe("3:05 PM");
		expect(formatDate(new Date(2020, 0, 1, 0, 0, 0), "hh:mm a")).toBe("12:00 am");
	});

	it("passes literal text in brackets through untouched", () => {
		expect(formatDate(date, "[Today:] YYYY [YYYY]")).toBe("Today: 2020 YYYY");
	});

	it("leaves plain non-token text alone", () => {
		expect(formatDate(date, "YYYY/MM")).toBe("2020/01");
	});

	it("formats ordinals, quarters and ISO weeks", () => {
		expect(formatDate(date, "Do MMMM")).toBe("1st January");
		expect(formatDate(new Date(2020, 0, 2), "Do")).toBe("2nd");
		expect(formatDate(new Date(2020, 0, 3), "Do")).toBe("3rd");
		expect(formatDate(new Date(2020, 0, 11), "Do")).toBe("11th");
		expect(formatDate(new Date(2020, 0, 22), "Do")).toBe("22nd");
		expect(formatDate(date, "[Q]Q")).toBe("Q1");
		expect(formatDate(new Date(2020, 11, 31), "Q")).toBe("4");
		// 2020-01-01 is in ISO week 1; 2021-01-03 still belongs to 2020-W53.
		expect(formatDate(date, "[W]WW")).toBe("W01");
		expect(formatDate(new Date(2021, 0, 3), "W")).toBe("53");
		expect(formatDate(new Date(2021, 0, 4), "W")).toBe("1");
	});

	it("formats the ISO week-year next to the ISO week", () => {
		// 2021-01-03 belongs to 2020-W53, 2024-12-30 already to 2025-W01.
		expect(formatDate(new Date(2021, 0, 3), "GGGG-[W]WW")).toBe("2020-W53");
		expect(formatDate(new Date(2024, 11, 30), "GGGG-[W]WW")).toBe("2025-W01");
	});

	it("falls back to ISO rules for locale weeks without a locale", () => {
		expect(formatDate(new Date(2021, 0, 3), "gggg-[W]ww w")).toBe("2020-W53 53");
	});

	it("uses the locale's week rules for gggg/ww/w", () => {
		// US weeks start on Sunday and week 1 holds January 1st.
		const us = formatDate(new Date(2021, 0, 3), "gggg-ww", "en");
		const isoGerman = formatDate(new Date(2021, 0, 3), "gggg-ww", "de");
		expect(isoGerman).toBe("2020-53");
		// Runtimes without Intl week info fall back to ISO.
		expect(["2021-02", "2020-53"]).toContain(us);
		expect(formatDate(new Date(2026, 11, 31), "gggg-ww", "en")).toMatch(/^(2027-01|2026-53)$/);
	});

	it("takes month and weekday names from the locale", () => {
		expect(formatDate(date, "dddd, D. MMMM", "de")).toBe("Mittwoch, 1. Januar");
		expect(formatDate(date, "dddd, MMMM D", "en")).toBe("Wednesday, January 1");
		expect(formatDate(date, "ddd MMM", "en")).toBe("Wed Jan");
	});

	it("falls back to English names for an unusable locale", () => {
		expect(formatDate(date, "MMMM", "not a locale!")).toBe("January");
	});
});
