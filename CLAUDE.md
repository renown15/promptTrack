# PromptTrack — Claude Code Rules

## Task list — CRITICAL

Always maintain `/Users/marklewis/dev/promptTrack/TASKS.md` throughout every task:

1. **Before starting** any multi-step work: write the full task list with `- [ ]` items
2. **After completing each step**: immediately update the file, marking that item `- [x]`
3. **When done**: reset the file to `## Status: idle`

Never batch updates — update after every individual step, not at the end.

## Always run before declaring work complete

```
make check   # typecheck + vite build
```

Unit tests alone are not sufficient. `make check` must pass.

## Architecture

- Strict layering: Route Handler → Service → Repository → Prisma
- No Prisma imports outside `packages/api/src/repositories/`
- Shared types via `z.infer<>` only — never hand-write types that mirror Zod schemas
- API files: `kebab-case.repository.ts`, `kebab-case.service.ts`, `kebab-case.routes.ts`
- Pure services: `const camelCase = {...}` object; framework-dependent: `build[Name]Service(fastify)` factory

## Database migrations — CRITICAL

- **Never edit files inside `prisma/migrations/`** after they have been applied
- Only edit `schema.prisma`, then run `make migrate-dev` to generate a new migration file
- Editing applied migration SQL causes Prisma drift and forces a destructive DB reset

## CSS — CRITICAL

- Tailwind only via `@apply` in co-located `.css` files — never inline Tailwind classes in `.tsx`
- BEM class names in `.tsx`
- CSS imports must use `@/` alias — relative imports are banned by ESLint `no-restricted-imports`
  - Correct: `import "@/components/features/chains/ChainNode.css"`
  - Wrong: `import "./ChainNode.css"`

## TypeScript gotchas

- `exactOptionalPropertyTypes: true` — use spread conditionals for optional fields:
  ```ts
  ...(input.description !== undefined && { description: input.description })
  ```
- Same applies to `MutateOptions` — use spread for `onSuccess` etc.

## Naming conventions

- DB: PascalCase models, snake_case tables (`@@map`), camelCase fields, snake_case columns (`@map`)
- Shared schemas: `PascalCase + Schema`, `PascalCase + Input`, `PascalCase + DTO`
- Frontend: `PascalCasePage.tsx`, `usePascalCase.ts`, `camelCaseStore.ts`, `[resource]Api` exports

## Commits

- Max 72 chars header, lowercase subject (e.g. `feat: add chain canvas`)

## Editor

- WYSIWYG editor is TipTap v2 (NOT CodeMirror)
- On save: `editor.storage.markdown.getMarkdown()`
- On load: `editor.commands.setContent(markdownContent)`

## Stack

- pnpm workspaces — use `make` targets, not pnpm directly
- Ports: web=5173, api=3051, postgres=5451
- `packages/shared` — Zod schemas shared by api and web
