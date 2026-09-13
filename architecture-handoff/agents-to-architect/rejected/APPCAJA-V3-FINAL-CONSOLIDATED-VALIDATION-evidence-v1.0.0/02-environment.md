  Windows: Microsoft Windows 11 Pro 10.0.26200  Build=26200
  Arquitectura: 64 bits
  ComputerName: NTTD-46YCT3
  CapturedAt: 2026-07-12 17:50:58 -03:00

--- where.exe node / npm ---
I:\Tools\node-v24.18.0-win-x64\node.exe
I:\Tools\node-v24.18.0-win-x64\npm
I:\Tools\node-v24.18.0-win-x64\npm.cmd
C:\Users\javie\AppData\Roaming\npm\npm.cmd

--- node --version / npm --version ---
  node: v24.18.0  (I:\Tools\node-v24.18.0-win-x64\node.exe)
  npm:  11.16.0
  node arch: x64

--- Gate: node must be exactly v24.18.0 ---
  expected: v24.18.0
  found:    v24.18.0
  GATE: PASS

--- Puertos ocupados (estado pre-campaña) ---

LocalPort OwningProcess
--------- -------------
      135          2168
      139             4
      445             4
      902          6292
      912          6292
     1536          1516
     1537          1896
     1538          2572
     1539          3888
     1542          5732
     1552          6288
     1777          2016
     2179          3128
     3050          6472
     5040          5756
     5112         51876
     5354          6172
     5357             4
     5939          6908
     5984          4640
     7679         53116
     7680         29776
    11434         39932
    13145         24116
    15321          5672
    20271          6568
    22885         27208
    27015          6264
    42050          9268
    42491          4864
    54002          4864
    61522         20652



--- procesos node pre-campaña ---
--- SSOT (read-only) ---
  Path: I:\cajaApp-V3\docs\00-context\APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md
  Size: 51697 bytes
  MTime: 07/12/2026 15:19:11
--- Backend .env keys (no values) ---
  NODE_ENV=<redacted, 11 chars>
  PORT=<redacted, 5 chars>
  HOST=<redacted, 9 chars>
  DATABASE_URL=<redacted, 13 chars>
  STORAGE_DIR=<redacted, 9 chars>
  MAX_UPLOAD_BYTES=<redacted, 8 chars>
  OLLAMA_MODE=<redacted, 11 chars>
  OLLAMA_PREFLIGHT_ENABLED=<redacted, 4 chars>
  OLLAMA_PREFLIGHT_TIMEOUT_MS=<redacted, 5 chars>
  OLLAMA_HEARTBEAT_INTERVAL_MS=<redacted, 5 chars>
  OLLAMA_KEEP_ALIVE=<redacted, 2 chars>
  OLLAMA_THINK=<redacted, 5 chars>
  OLLAMA_STRUCTURED_OUTPUT=<redacted, 4 chars>
  OLLAMA_NUM_CTX=<redacted, 1 chars>
  OLLAMA_BASE_URL=<redacted, 22 chars>
  OLLAMA_API_KEY=<redacted, 0 chars>
  OLLAMA_MODEL=<redacted, 20 chars>
  OLLAMA_TIMEOUT_MS=<redacted, 6 chars>
  OLLAMA_MAX_RETRIES=<redacted, 1 chars>
  AI_PROVIDER=<redacted, 6 chars>
  AI_BASE_URL=<redacted, 25 chars>
  AI_CHAT_COMPLETIONS_PATH=<redacted, 17 chars>
  AI_API_KEY=<redacted, 0 chars>
  AI_MODEL=<redacted, 20 chars>
  AI_TIMEOUT_MS=<redacted, 6 chars>
  AI_JOB_TIMEOUT_MS=<redacted, 6 chars>
  AI_PROCESSING_STALE_AFTER_MS=<redacted, 6 chars>
  AI_WORKER_POLL_INTERVAL_MS=<redacted, 4 chars>
  AI_MAX_OUTPUT_TOKENS=<redacted, 5 chars>
  AI_TEMPERATURE=<redacted, 1 chars>
  AI_TOKEN_PARAMETER=<redacted, 10 chars>
  AI_RESPONSE_FORMAT=<redacted, 4 chars>
  PYTHON_EXECUTABLE=<redacted, 24 chars>
  PDF_RAW_EXTRACTOR_SCRIPT=<redacted, 20 chars>
  PDF_RAW_EXTRACTION_TIMEOUT_MS=<redacted, 5 chars>
  PDF_RAW_MAX_OUTPUT_BYTES=<redacted, 7 chars>
  PDF_RAW_MAX_CHARACTERS=<redacted, 6 chars>
  CARD_STATEMENT_PROMPTS_DIR=<redacted, 29 chars>
  CARD_STATEMENT_SCHEMAS_DIR=<redacted, 29 chars>
  AI_MOCK_MODE=<redacted, 5 chars>
  AI_DEBUG_CAPTURE_OLLAMA_REQUEST=<redacted, 5 chars>
--- Migrations disponibles ---
  20260709170341_init
  20260711160000_add_incomes
  20260711190000_add_income_event_currency
  20260711213000_add_manual_movements_and_categories
  20260711221500_add_debit_csv_imports
  20260711234500_add_category_rules
  20260712141000_add_currency_exchange_rate
  20260712150000_add_card_statement_history
  20260712153000_add_local_app_settings
  20260712180000_add_savings_goals
  20260712183000_add_category_budgets
--- SQLite (db efectiva) ---
  Path: I:\cajaApp-V3\workspace\backend\dev.db
  Exists before backup: False
