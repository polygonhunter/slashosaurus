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
});
