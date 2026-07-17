/**
 * Tiny date formatter with Moment-compatible tokens — replaces the moment
 * re-export from the obsidian package, which is untyped in the review
 * linter's environment and only powers the "Today's date" block anyway.
 *
 * Supported tokens: YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh h mm m ss s
 * A a — literal text goes in [brackets].
 */

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TOKEN_RE = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g;

const pad = (n: number): string => String(n).padStart(2, "0");

export function formatDate(date: Date, format: string): string {
	return format.replace(TOKEN_RE, (token, literal: string | undefined) => {
		if (literal !== undefined) return literal;
		const hours24 = date.getHours();
		const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
		switch (token) {
			case "YYYY":
				return String(date.getFullYear());
			case "YY":
				return pad(date.getFullYear() % 100);
			case "MMMM":
				return MONTHS[date.getMonth()] ?? "";
			case "MMM":
				return (MONTHS[date.getMonth()] ?? "").slice(0, 3);
			case "MM":
				return pad(date.getMonth() + 1);
			case "M":
				return String(date.getMonth() + 1);
			case "dddd":
				return WEEKDAYS[date.getDay()] ?? "";
			case "ddd":
				return (WEEKDAYS[date.getDay()] ?? "").slice(0, 3);
			case "DD":
				return pad(date.getDate());
			case "D":
				return String(date.getDate());
			case "HH":
				return pad(hours24);
			case "H":
				return String(hours24);
			case "hh":
				return pad(hours12);
			case "h":
				return String(hours12);
			case "mm":
				return pad(date.getMinutes());
			case "m":
				return String(date.getMinutes());
			case "ss":
				return pad(date.getSeconds());
			case "s":
				return String(date.getSeconds());
			case "A":
				return hours24 < 12 ? "AM" : "PM";
			case "a":
				return hours24 < 12 ? "am" : "pm";
			default:
				return token;
		}
	});
}
