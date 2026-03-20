/**
 * Monday of the week containing `date`, formatted yyyy-MM-dd (local calendar).
 * Align with frontend date-fns startOfWeek(..., { weekStartsOn: 1 }).
 */
function getMondayDateString(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

module.exports = { getMondayDateString };
