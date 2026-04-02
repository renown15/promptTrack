# Claude Tasks

_Updated by Claude. Visible in Agent Insight._

## Status: idle

### Last Session

Implemented agent REST layer for stateless tool invocation:

- Created `/api/agent/tools` GET endpoint (tool definitions in OpenAI format)
- Created `/api/agent/tools` POST endpoint (stateless tool invocation)
- Split implementation: `agent.service.ts` (120 lines) + `agent-tool-handlers.ts` (180 lines)
- All 8 MCP tools exposed via stateless REST: list/get prompts, chains, insights
- Both `make check` + `make test` passing ✅
