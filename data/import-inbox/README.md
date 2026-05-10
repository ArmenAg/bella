# Import Inbox

Drop new PDFs, Markdown files, text exports, XML/JSON/CSV exports, or zipped portal exports here, then run:

```bash
npm run import:inbox
```

The importer writes review files under `data/bootstrap/`. Those generated files are ignored by git because they may contain health information.

PDF files are text-scanned with `pdftotext` when it is installed. If `pdftotext` is unavailable, the file is still registered as a source/attachment candidate, but content fields will need manual review.
