# Claude Tasks

_Updated by Claude. Visible in Agent Insight._

## Status: completed

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
