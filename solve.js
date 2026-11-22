// csv-reader-speed-01: single-loop state machine.
// One pass over the input with charCodeAt; slices only at field ends.
// Semantics identical to the indexOf parser it replaces.
export function run(input) {
  const text = String(input.text), header = input.header === true;
  const n = text.length, rows = [], errors = [];
  let columns = null, width = -1;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1, recordRow = 0;
  let fields = [];
  let value = null, start = pos, state = 0;
  let quoted = false, junk = -1, openPos = 0, openLine = 1;
  const err = code => errors.push({ code, line: recordLine, row: recordRow });
  const pushField = end => {
    const f = value === null ? text.slice(start, end) : value + text.slice(start, end);
    if (junk >= 0 && f.length > junk) err('quote_junk');
    fields.push(f);
    value = null; junk = -1;
  };
  const endRecord = () => {
    if (fields.length === 1 && fields[0] === '' && !quoted) { fields = []; return; }
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; fields = []; return; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
    fields = [];
  };

  for (;;) {
    if (pos >= n) {
      if (state === 0) break;
      if (state === 1) { fields.push(''); endRecord(); break; }
      if (state === 2) { pushField(n); endRecord(); break; }
      err('unterminated_quote');
      line = openLine;
      value = '"'; start = openPos + 1; pos = start; quoted = true; junk = -1; state = 2;
      continue;
    }
    if (state === 0) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos++; line++; continue; }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; continue; }
      recordLine = line;
      recordRow = header && columns === null ? null : rows.length;
      state = 1;
      continue;
    }
    if (state === 1) {
      if (text.charCodeAt(pos) === 34) {
        quoted = true; junk = -1; openPos = pos; openLine = line;
        pos++; start = pos; value = null; state = 3;
      } else {
        quoted = false; junk = -1; start = pos; value = null; state = 2;
      }
      continue;
    }
    if (state === 2) {
      while (pos < n) {
        const c = text.charCodeAt(pos);
        if (c === 44 || c === 10 || c === 13) break;
        pos++;
      }
      if (pos >= n) { pushField(n); endRecord(); break; }
      const c = text.charCodeAt(pos);
      if (c === 44) { pushField(pos); pos++; state = 1; continue; }
      if (c === 10) { pushField(pos); pos++; line++; endRecord(); state = 0; continue; }
      if (text.charCodeAt(pos + 1) === 10) { pushField(pos); pos += 2; line++; endRecord(); state = 0; continue; }
      value = value === null ? text.slice(start, pos) : value + text.slice(start, pos);
      start = pos + 1; pos = start; err('stray_cr');
      continue;
    }
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 34 || c === 10 || c === 13) break;
      pos++;
    }
    if (pos >= n) {
      err('unterminated_quote');
      line = openLine;
      value = '"'; start = openPos + 1; pos = start; quoted = true; junk = -1; state = 2;
      continue;
    }
    const c = text.charCodeAt(pos);
    if (c === 34) {
      if (text.charCodeAt(pos + 1) === 34) {
        value = value === null ? text.slice(start, pos) + '"' : value + text.slice(start, pos) + '"';
        pos += 2; start = pos;
        continue;
      }
      const prefix = value === null ? text.slice(start, pos) : value + text.slice(start, pos);
      pos++;
      if (pos >= n) { fields.push(prefix); value = null; junk = -1; endRecord(); state = 0; continue; }
      const d = text.charCodeAt(pos);
      if (d === 44) { fields.push(prefix); value = null; junk = -1; pos++; state = 1; continue; }
      if (d === 10) { fields.push(prefix); value = null; junk = -1; pos++; line++; endRecord(); state = 0; continue; }
      if (d === 13 && text.charCodeAt(pos + 1) === 10) { fields.push(prefix); value = null; junk = -1; pos += 2; line++; endRecord(); state = 0; continue; }
      value = prefix; junk = prefix.length; start = pos; state = 2;
      continue;
    }
    value = value === null ? text.slice(start, pos) + '\n' : value + text.slice(start, pos) + '\n';
    line++;
    pos += (c === 13 && text.charCodeAt(pos + 1) === 10) ? 2 : 1;
    start = pos;
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
