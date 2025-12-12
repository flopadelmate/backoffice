# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **PadelMate Back-Office**, an internal admin tool for managing padel clubs, viewing KPIs, and testing the matchmaking algorithm. Built with Next.js 15 (App Router), TypeScript strict mode, TanStack Query, and shadcn/ui.

**Key constraint**: This is a V1 skeleton with **mocked data**. All hooks contain `TODO` comments indicating where to replace mocks with real API calls.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint

# Adding UI components
npx shadcn@latest add [component-name]  # Add new shadcn/ui component
```

## Development Principles

### Core Principles
- **KISS (Keep It Simple, Stupid)**: Always favor simple, readable solutions over clever complexity
- **DRY (Don't Repeat Yourself)**: Extract reusable components, hooks, and utilities
- **Consistency First**: Before creating new patterns, check existing implementations in the codebase
- **No Premature Optimization**: Build working features first, optimize based on real metrics

### Code Reusability Guidelines
- **Check existing before creating**: Search for similar components/functions before writing new ones
- **Extract common patterns**: If code is used 3+ times, extract to shared utility
- **Maintain pattern consistency**: Follow established patterns for state management, API calls, styling
- **Component library mindset**: Build reusable UI components in a generic way

### Component Development Guidelines

**Mandatory Workflow:**
1. **Research first**:
   - **STEP 1:** Check component documentation for existing primitives/patterns
   - **STEP 2:** Search `src/components/` for similar implementations
   - **STEP 3:** Verify conventions for naming/structure rules
2. **Plan then code**: Present plan via ExitPlanMode, wait for approval
3. **Validate**: Run type checking after changes

**Reusability Rule:**
- Component used 1-2 times: Keep in domain layer
- Component used 3+ times: Extract to UI layer and document

**Critical Rules:**
- ❌ NO hardcoded values: Use design tokens/CSS variables
- ✅ Always use tokens: colors, spacing, typography from design system
- Follow component hierarchy: Primitives → UI → Domain
- Reuse before creating (if used 3+ times, extract)

### TypeScript Quality Standards

**Strict Mode Enforcement:**
The project uses TypeScript strict mode. This is non-negotiable and must be preserved at all times.

**Forbidden Practices:**
- ❌ **NEVER use `any`** except in extremely rare, documented cases where no alternative exists
- ❌ **NEVER use `@ts-ignore` or `@ts-expect-error`** without explicit justification in comments
- ❌ **NO quick fixes that bypass type safety** (e.g., `as any`, `as unknown as X` without reason)
- ❌ **NO implicit any** - all function parameters and return types must be explicitly typed

**Required Practices:**
- ✅ **Always preserve type safety** - if a type error occurs, fix the root cause, not the symptom
- ✅ **Use explicit type assertions** - if casting is necessary, use specific types and document why
- ✅ **Type compatibility issues** - resolve with proper type definitions or explicit, documented casting to specific types
- ✅ **Check TypeScript errors after modifications** - always verify there are no type errors after making code changes
- ✅ **When uncertain** - ask for clarification rather than weakening types

### Git Workflow
⚠️ **IMPORTANT**: Never perform git operations (commit, push, merge, etc.) without explicit request. Always ask before:
- Making commits
- Pushing changes
- Creating/switching branches
- Any git operation that modifies history

When requested to commit, use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
- `docs:` Documentation only

### Server Commands
⚠️ **IMPORTANT**: Never run server commands (start, stop, restart, or any process management) without explicit request. This includes:
- `npm start`, dev server startup
- `npm run dev`, `npm run build`
- Background processes or long-running commands
- **Exception**: Test commands (e.g., `npm test`, `npm run lint`) are allowed when needed for validation

Always ask before starting any server or development process. The developer controls when and how the application runs.

## Architecture Patterns

### 1. Authentication Flow (In-Memory)

**Key files**: `providers/auth-provider.tsx`, `lib/api-client.ts`, `hooks/use-auth.ts`

Authentication is intentionally simple for V1:
- **Access token** stored in React state (memory only, no localStorage)
- **No refresh token** yet (planned for V2)
- **Automatic 401 handling**: When API returns 401 (except on login endpoint), triggers automatic logout and redirect to `/login`

**How it works**:
```typescript
// 1. AuthProvider sets up the handler on mount
apiClient.setUnauthorizedHandler(logout)

// 2. api-client.ts detects 401 and calls the handler
if (response.status === 401 && !isLoginEndpoint) {
  this.unauthorizedHandler?.()  // Triggers logout + redirect
}

// 3. Login mutation calls this to authenticate
login(token, user)  // Updates state + apiClient.setToken()
```

**Protection**: Routes under `app/admin/*` are protected by the layout which checks `isAuthenticated` and redirects to `/login` if needed.

### 2. Data Fetching Pattern (TanStack Query + Mocks)

**Key files**: `hooks/use-*.ts`, `lib/api-client.ts`

All data hooks follow this pattern:
```typescript
export function useClubs(params) {
  return useQuery({
    queryKey: ["clubs", params],
    queryFn: async () => {
      // TODO: Remplacer par apiClient.getClubs(params)
      // For now, use mock data
      return MOCK_CLUBS;
    },
  });
}
```

**To connect backend**:
1. Search for `// TODO: Remplacer par` in `hooks/` directory
2. Uncomment the `apiClient.*` call
3. Remove mock data logic
4. Ensure `NEXT_PUBLIC_API_URL` is set in `.env.local`

### 3. API Client Architecture

**Key file**: `lib/api-client.ts`

Centralized client with:
- Token injection in all requests
- 401 detection and automatic logout (via `setUnauthorizedHandler`)
- Typed methods for all endpoints
- Error handling with custom `ApiError` class

**To add new endpoints**:
1. Add types in `types/api.ts`
2. Add method in `ApiClient` class: `async getMyResource(): Promise<MyType>`
3. Create hook in `hooks/use-my-resource.ts` using TanStack Query
4. Use hook in components

### 4. Backend API Documentation

**Swagger URL**: https://backhand-test.up.railway.app/api-docs/backoffice

⚠️ **Important**: Ce projet utilise uniquement les endpoints `/backoffice/*` de l'API.

Consultez la documentation Swagger pour voir tous les endpoints disponibles, leurs paramètres, et les modèles de données.

### 5. App Router Structure

```
app/
├── admin/            # Admin routes with shared layout and auth protection
│   ├── layout.tsx    # Admin layout: checks auth, redirects if needed
│   ├── dashboard/
│   ├── clubs/
│   ├── kpi/
│   └── matchmaking/lab/
├── login/            # Public route
└── layout.tsx        # Root layout: wraps with QueryProvider + AuthProvider
```

All routes under `admin/` share a layout that handles authentication checks.

**Middleware** (`middleware.ts`): Minimal, just redirects `/` to `/login`. Real auth protection is client-side in the layout.

### 6. Type Safety Strategy

All API types are in `types/api.ts`. The project uses:
- TypeScript strict mode
- Explicit return types on all API methods
- Generic TanStack Query hooks: `useQuery<ReturnType>()`, `useMutation<ReturnType>()`

**When adding features**: Define types first in `types/api.ts`, then implement.

## Module-Specific Notes

### Matchmaking Lab (`app/admin/matchmaking/lab/`)
Three sections (Player Factory, Queue Control, Algo Runner) in a single page. State is managed in module scope variables in `hooks/use-matchmaking.ts` for demo purposes. This will be replaced by real backend persistence.

### Clubs Module
Simple CRUD: list with search/pagination, detail page with editable fields (status, visible, courtCount). Mock data includes 5 sample clubs.

### KPI Module
Dashboard with 4 metrics cards. Auto-refreshes every minute (`refetchInterval: 60000` in TanStack Query).

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api  # Backend API base URL
```

## Important Constraints

1. **No tests configured** (Jest, Vitest, Playwright) - intentional for V1
2. **No analytics/monitoring** (Sentry, PostHog) - stub in `lib/monitoring.ts`
3. **No refresh tokens** - logout on any 401
4. **Client-side auth only** - middleware doesn't verify tokens
5. **Mock data everywhere** - search for `TODO` comments to find integration points

## Next Steps for Backend Integration

1. Configure `NEXT_PUBLIC_API_URL` in `.env.local`
2. Search codebase for `// TODO: Remplacer par apiClient`
3. Replace mocked `queryFn` implementations with real API calls
4. Test each module individually
5. Handle backend-specific error formats in `api-client.ts`

## Code Conventions & Quality Standards

### Naming Conventions
- **Imports**: Use `@/` alias for root-level imports
- **Components**: PascalCase, one component per file
- **Hooks**: camelCase starting with `use`, export multiple hooks per file
- **API methods**: camelCase, return Promise with typed response
- **Styles**: Tailwind utility classes, use shadcn/ui components
- **Forms**: react-hook-form + zod validation (see `app/login/page.tsx` for example)

### Quality Standards

**Essential Practices:**
- **Run type checking before committing**: `npm run type-check` or `tsc --noEmit`
- **TypeScript strict mode**: Essential for maintainability with complex state management
- **Error handling**: Implement Error Boundaries for graceful degradation

**Code Simplicity:**
- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
  - Don't add features, refactor code, or make "improvements" beyond what was asked
  - Don't add error handling, fallbacks, or validation for scenarios that can't happen
  - Don't create helpers, utilities, or abstractions for one-time operations
  - The right amount of complexity is the minimum needed for the current task

**Clean Code:**
- Avoid backwards-compatibility hacks like renaming unused `_vars`, re-exporting types, adding `// removed` comments for removed code, etc.
- If something is unused, delete it completely
