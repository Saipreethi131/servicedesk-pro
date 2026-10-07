// Business calendar: Monday-Friday, 09:00-18:00, server-local time (DST follows whatever the host OS does -
// native Date.getHours()/setHours() are already local, so there is nothing extra to do for it here).
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;
const MINUTES_PER_MS = 1 / 60000;

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6

const atHour = (date, hour) => {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// The next business day's opening (09:00), skipping weekends. Always moves forward at least one calendar day,
// so it is safe to call on a moment that is already exactly 09:00 without producing a zero-length step.
const nextBusinessDayStart = (date) => {
  const d = atHour(date, BUSINESS_START_HOUR);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
};

// The "outside business hours" rule, spelled out explicitly:
//   - Weekend, any time of day         -> the following Monday at 09:00.
//   - Weekday, before 09:00            -> 09:00 that same day (the day has not opened yet).
//   - Weekday, at or after 18:00       -> 09:00 the next business day (today has already closed).
//   - Weekday, between 09:00 and 18:00 -> unchanged.
// Only the "at/after 18:00 rolls to the next day" and "weekend rolls to Monday" cases were given as examples
// in the task this was built for; "before 09:00 rolls forward to 09:00 the same day" is this function's own
// symmetric extension of the same rule, applied so every possible input has a defined result.
const roundToOpen = (date) => {
  if (isWeekend(date)) {
    let d = atHour(date, BUSINESS_START_HOUR);
    while (isWeekend(d)) d.setDate(d.getDate() + 1);
    return d;
  }
  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  if (minutesSinceMidnight < BUSINESS_START_HOUR * 60) return atHour(date, BUSINESS_START_HOUR);
  if (minutesSinceMidnight >= BUSINESS_END_HOUR * 60) return nextBusinessDayStart(date);
  return new Date(date);
};

// Pure: no DB, no req/res. Adds `minutes` of BUSINESS time (never wall-clock time) to startDate, Mon-Fri
// 09:00-18:00 only. A startDate outside business hours is first rounded forward per roundToOpen above, then
// minutes are consumed against each business day's remaining capacity (09:00-18:00 = 540 minutes/day),
// carrying any overflow into the next business day - and the one after that, skipping weekends - as needed.
export const addBusinessMinutes = (startDate, minutes) => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new TypeError("startDate must be a valid Date");
  }
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new TypeError("minutes must be a non-negative number");
  }

  let cursor = roundToOpen(startDate);
  let remaining = minutes;

  while (remaining > 0) {
    const closeToday = atHour(cursor, BUSINESS_END_HOUR);
    const availableToday = (closeToday.getTime() - cursor.getTime()) * MINUTES_PER_MS;
    if (remaining <= availableToday) {
      cursor = new Date(cursor.getTime() + remaining / MINUTES_PER_MS);
      remaining = 0;
    } else {
      remaining -= availableToday;
      cursor = nextBusinessDayStart(cursor);
    }
  }
  return cursor;
};
