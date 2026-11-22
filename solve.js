// Delimiter positions only move forward during ordinary reads; reuse the next
// match across fields so a long unquoted stretch is not searched repeatedly.
export function run(input) {
  const text = String(input.text), header = input.header === true;
  const n = text.length, rows = [], errors = [];
  let columns = null, width = -1, pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1, recordLine, recordRow;
  let comma = -1, lf = -1, cr = -1;
  const error = code => errors.push({ code, line: recordLine, row: recordRow });
  const find = (char, start) => {
    const at = text.indexOf(char, start);
    return at < 0 ? n : at;
  };
  // Returns a value; `more` indicates that the consumed delimiter was a comma.
  let more = false;
  function unquoted(prefix) {
    let value = prefix;
    for (;;) {
      if (comma < pos) comma = find(',', pos);
      if (lf < pos) lf = find('\n', pos);
      if (cr < pos) cr = find('\r', pos);
      const end = Math.min(comma, lf, cr);
      value += text.slice(pos, end);
      pos = end;
      if (end === n) { more = false; return value; }
      if (end === comma) { pos++; more = true; return value; }
      if (end === lf) { pos++; line++; more = false; return value; }
      pos++;
      if (text.charCodeAt(pos) === 10) {
        pos++; line++; more = false; return value;
      }
      error('stray_cr');
    }
  }
  function quoted() {
    const open = pos, openLine = line;
    let start = ++pos, value = '';
    for (;;) {
      const quote = text.indexOf('"', pos);
      if (quote < 0) {
        pos = open + 1; line = openLine;
        error('unterminated_quote');
        return unquoted('"');
      }
      let span = text.slice(start, quote);
      if (span.indexOf('\r') >= 0) {
        span = span.replace(/\r\n?/g, '\n');
      }
      if (span.indexOf('\n') >= 0) {
        let at = -1;
        while ((at = span.indexOf('\n', at + 1)) >= 0) line++;
      }
      value += span;
      pos = quote + 1;
      if (text.charCodeAt(pos) === 34) {
        value += '"'; start = ++pos; continue;
      }
      if (pos === n) { more = false; return value; }
      const c = text.charCodeAt(pos);
      if (c === 44) { pos++; more = true; return value; }
      if (c === 10) { pos++; line++; more = false; return value; }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2; line++; more = false; return value;
      }
      const result = unquoted(value);
      if (result.length > value.length) error('quote_junk');
      return result;
    }
  }
  while (pos < n) {
    const c = text.charCodeAt(pos);
    if (c === 10) { pos++; line++; continue; }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2; line++; continue;
    }
    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let isQuoted;
    do {
      isQuoted = text.charCodeAt(pos) === 34;
      fields.push(isQuoted ? quoted() : unquoted(''));
    } while (more);
    if (fields.length === 1 && fields[0] === '' && !isQuoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
