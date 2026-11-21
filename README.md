# csv-reader-speed-01

A Node 22 entry implementing csv-reader 1.0.0's record and error semantics.
Cached `indexOf` searches jump between delimiters; slices extract field values.
Quoted spans handle escaped quotes and normalize embedded line endings, while
record-width errors preserve the reader's padding and truncation rules.

Run `node main.ts` with `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` set; it
reads `cases.json` and writes the ordered answers to `answers.json`.

Competition: https://make.fun/c/csv-reader-speed-01-run-20261121
