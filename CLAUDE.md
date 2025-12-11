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

**Protection**: Routes under `app/(admin)/*` are protected by the layout which checks `isAuthenticated` and redirects to `/login` if needed.

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

### 4. App Router Structure

```
app/
├── (admin)/          # Route group - shares layout with auth protection
│   ├── layout.tsx    # Admin layout: checks auth, redirects if needed
│   ├── dashboard/
│   ├── clubs/
│   ├── kpi/
│   └── matchmaking/lab/
├── login/            # Public route
└── layout.tsx        # Root layout: wraps with QueryProvider + AuthProvider
```

**Route groups** `(admin)` don't add URL segments but share a layout. This layout handles authentication checks.

**Middleware** (`middleware.ts`): Minimal, just redirects `/` to `/login`. Real auth protection is client-side in the layout.

### 5. Type Safety Strategy

All API types are in `types/api.ts`. The project uses:
- TypeScript strict mode
- Explicit return types on all API methods
- Generic TanStack Query hooks: `useQuery<ReturnType>()`, `useMutation<ReturnType>()`

**When adding features**: Define types first in `types/api.ts`, then implement.

## Module-Specific Notes

### Matchmaking Lab (`app/(admin)/matchmaking/lab/`)
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

## Code Conventions

- **Imports**: Use `@/` alias for root-level imports
- **Components**: PascalCase, one component per file
- **Hooks**: camelCase starting with `use`, export multiple hooks per file
- **API methods**: camelCase, return Promise with typed response
- **Styles**: Tailwind utility classes, use shadcn/ui components
- **Forms**: react-hook-form + zod validation (see `app/login/page.tsx` for example)
