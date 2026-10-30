/**
 * Tiny date formatter with Moment-compatible tokens — replaces the moment
 * re-export from the obsidian package, which is untyped in the review
 * linter's environment and only powers the "Today's date" block anyway.
 *
 * Supported tokens: YYYY YY Q MMMM MMM MM M GGGG WW W gggg ww w Do DD D dddd
 * ddd HH H hh h mm m ss s A a — literal text goes in [brackets]. GGGG/WW/W
 * are ISO week-year and weeks; gggg/ww/w follow the locale's week rules
 * (ISO when unknown). Do is an English ordinal (1st, 2nd …), Q the quarter.
 *
 * Month and weekday names come from Intl in the injected locale (Obsidian's
 * language, like moment there); without one they are English.
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

const TOKEN_RE =
	/\[([^\]]*)\]|YYYY|YY|Q|MMMM|MMM|MM|M|GGGG|WW|W|gggg|ww|w|dddd|ddd|Do|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g;

const pad = (n: number): string => String(n).padStart(2, "0");

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
function ordinal(n: number): string {
	const tens = n % 100;
	if (tens >= 11 && tens <= 13) return `${n}th`;
	const suffix = ["th", "st", "nd", "rd"][n % 10] ?? "th";
	return `${n}${suffix}`;
}

interface WeekRules {
	/** First day of the week, 0 = Sunday. */
	firstDay: number;
	/** Days of the new year week 1 must hold (ISO: 4, US: 1). */
	minimalDays: number;
}

const ISO_WEEKS: WeekRules = { firstDay: 1, minimalDays: 4 };

/** Week number and week-year: week 1 is the first week holding at least
 *  minimalDays days of the year. */
function weekOf(date: Date, rules: WeekRules): { week: number; year: number } {
	const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	// Back to the week's first day, then on to the day that decides which
	// year the week belongs to (ISO: its Thursday).
	const sinceStart = (day.getUTCDay() - rules.firstDay + 7) % 7;
	day.setUTCDate(day.getUTCDate() - sinceStart + 7 - rules.minimalDays);
	const year = day.getUTCFullYear();
	const dayOfYear = (day.getTime() - Date.UTC(year, 0, 1)) / 86_400_000;
	return { week: Math.floor(dayOfYear / 7) + 1, year };
}

type WeekInfo = { firstDay: number; minimalDays: number };

/** The locale's week rules where the runtime knows them, else ISO. */
function localeWeeks(locale: string | undefined): WeekRules {
	if (locale === undefined) return ISO_WEEKS;
	try {
		const loc = new Intl.Locale(locale) as Intl.Locale & {
			getWeekInfo?: () => WeekInfo;
			weekInfo?: WeekInfo;
		};
		const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
		if (!info) return ISO_WEEKS;
		// Intl counts Sunday as 7.
		return { firstDay: info.firstDay % 7, minimalDays: info.minimalDays };
	} catch {
		return ISO_WEEKS;
	}
}

/** A month or weekday name in the locale, or the English fallback. */
function localName(
	date: Date,
	locale: string | undefined,
	options: Intl.DateTimeFormatOptions,
	english: string,
): string {
	if (locale === undefined) return english;
	try {
		return new Intl.DateTimeFormat(locale, options).format(date);
	} catch {
		return english;
	}
}

export function formatDate(date: Date, format: string, locale?: string): string {
	return format.replace(TOKEN_RE, (token, literal: string | undefined) => {
		if (literal !== undefined) return literal;
		const hours24 = date.getHours();
		const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
		switch (token) {
			case "YYYY":
				return String(date.getFullYear());
			case "YY":
				return pad(date.getFullYear() % 100);
			case "Q":
				return String(Math.floor(date.getMonth() / 3) + 1);
			case "GGGG":
				return String(weekOf(date, ISO_WEEKS).year);
			case "WW":
				return pad(weekOf(date, ISO_WEEKS).week);
			case "W":
				return String(weekOf(date, ISO_WEEKS).week);
			case "gggg":
				return String(weekOf(date, localeWeeks(locale)).year);
			case "ww":
				return pad(weekOf(date, localeWeeks(locale)).week);
			case "w":
				return String(weekOf(date, localeWeeks(locale)).week);
			case "Do":
				return ordinal(date.getDate());
			case "MMMM":
				return localName(date, locale, { month: "long" }, MONTHS[date.getMonth()] ?? "");
			case "MMM":
				return localName(
					date,
					locale,
					{ month: "short" },
					(MONTHS[date.getMonth()] ?? "").slice(0, 3),
				);
			case "MM":
				return pad(date.getMonth() + 1);
			case "M":
				return String(date.getMonth() + 1);
			case "dddd":
				return localName(date, locale, { weekday: "long" }, WEEKDAYS[date.getDay()] ?? "");
			case "ddd":
				return localName(
					date,
					locale,
					{ weekday: "short" },
					(WEEKDAYS[date.getDay()] ?? "").slice(0, 3),
				);
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
