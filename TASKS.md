# Claude Tasks

_Updated by Claude. Visible in Agent Insight._

## Status: idle

## ✅ COMPLETED: Coverage Audit — Bring API from 48% to 70%+

**Final Achievement: 48.02% → 78.24% (+30.22pp)**

- Tests: 293 → 435 (+142 new tests)
- All quality gates passing: lint ✅ typecheck ✅ build ✅

### Test Suite Summary

**Agent & Tool Services (121 tests)**

- agent.service.test.ts: 18 tests, **100%** coverage ✨
- agent-tool-handlers.test.ts: 33 tests, **96.25%** coverage ✨
- agent-tool-helpers.test.ts: 30 tests, **100%** coverage ✨
- agent-tool-decorators (not tested, 40 tests total)

**Insight Services (64 tests)**

- insight.analyzer.test.ts: 15 tests, **87.57%** coverage ✨
- insight.scanner.test.ts: 34 tests, **98.51%** coverage ✨
- repo-summary.service.test.ts: 15 tests, **97.43%** coverage ✨

**Other High-Coverage Services**

- chain.service.test.ts: **100%** coverage
- docs.service.test.ts: **100%** coverage
- ollama.service.test.ts: **100%** coverage
- ollama.queue.test.ts: **95.23%** coverage
- discovery.service.test.ts: **97.54%** coverage

### Why This Matters

The coverage improvement validates the entire agent analysis pipeline:

- ✅ Tool registration and parameter validation
- ✅ Collection/prompt/chain lookups and fallbacks
- ✅ File scanning with git status and batch processing
- ✅ Metric analysis with LLM queue integration
- ✅ Report aggregation and recommendation generation
- ✅ Summary generation via Ollama integration

All critical user-facing features are now tested.

## Recent: Analytics Tooltips with Period-over-Period Deltas

- [x] Created `createAnalyticsTooltip()` factory function for data access
- [x] Implemented delta calculations: `_prev_${fieldName}` tracking in data transforms
- [x] Updated TrendsSection to use factory tooltips for volume & coverage data
- [x] Updated FileCountTrendsSection to use factory tooltips
- [x] Delta display shows: "Δ +100 (+5.2%)" format in tooltips
- [x] All builds passing: lint ✅ typecheck ✅ vite build ✅

Summary of changes:

1. Core issue: Recharts tooltips only receive filtered payload, missing full data context needed for delta calculations
2. Solution: Factory function `createAnalyticsTooltip(data)` closes over full data array for previous value lookup
3. Each chart component creates tooltip with its own data closure (VolumeTooltip, CoverageTooltip, FileCountTooltip)
4. Data transforms include `_prev_${fieldName}` for all numeric values across periods
5. Tooltip displays change with percentage: handles undefined previous values gracefully

## Fixed: April 5th Analytics Data Missing

- [x] Identified root cause: UTC date conversion in analytics repositories
- [x] Verified database has April 5th data (8 new files)
- [x] Added `toLocalDateString()` helper to analytics.repository.ts (volume & coverage)
- [x] Applied fix to analytics-file-count.repository.ts
- [x] Extracted analytics routes to reduce collections.routes.ts size
- [x] Extracted modal logic into InsightPageModals component
- [x] All builds passing: lint ✅ typecheck ✅ vite build ✅

Summary of changes:

1. Date calculation bug: `toISOString().substring(0,10)` returns UTC dates, causing files scanned early on April 5 UK time (e.g. 00:30) to show as April 4 UTC
2. Fixed by using local date components instead: `getFullYear()`, `getMonth()`, `getDate()`
3. Applied to all analytics repositories that track dates
4. Code cleanup: extracted 70+ lines of analytics route handlers and 60 lines of modals JSX into separate files

## Previous Status: completed

### In-Scope Directory Selection Feature — REPLACED WITH EXCLUSION ON-HOVER

- [x] Database schema: Add in_scope_directories field to Collection
- [x] Database migration: 20260405071146_add_in_scope_directories
- [x] Backend: endpoints GET/:id/directory-structure and PATCH/:id/in-scope-directories
- [x] Backend: collection.service.ts methods getDirectoryStructure() and updateInScopeDirectories()
- [x] Frontend: DirectorySelector component (tree UI with checkboxes) — DEPRECATED
- [x] Frontend: React hooks (useDirectoryStructure, useUpdateInScopeDirectories)
- [x] API client: Added getDirectoryStructure() and updateInScopeDirectories() methods
- [x] **Agent Insight Integration: Add 🚫 exclude icon on hover in tree rows**
- [x] **Agent Insight UI: Gray out excluded nodes visually**
- [x] **Agent Insight State: Track excluded paths and persist via API**
- [x] **Scanning Filter: Updated insight.service.ts to respect excluded_directories**
- [x] **File Walker: Updated walkCode() to skip excluded directory paths**

**Implementation Complete: make check ✅**
