# Phase 2E — Travel Executable Bootstrap

## Status

Bootstrap executable boundary only.

This phase does **not** activate the legacy V7 Travel runtime as an
independent production application.

## Files

- `travel.html`
- `travel.css`
- `travel-bootstrap.js`
- `runtime/*` remains reference-only

## Locked principles

1. Existing V7 Travel UI/UX remains the visual and functional parity source.
2. Control Center remains intact during extraction.
3. `/p/travel` remains available until parity validation succeeds.
4. Canonical business data must not be duplicated.
5. Payment, gateway, booking, notification, SegaDeals and other shared
   domain services remain canonical shared services.
6. Hostname and client-side role values are not authorization.
7. Production Travel authorization must validate:
   - authenticated session
   - Travel role / Travel staff role
   - Travel tenant membership
   - explicit permission
   - database RLS
8. No fake authentication or tenant simulation is permitted.
9. Reference runtime files are not automatically executable.
10. Removal of legacy `/p/travel` is prohibited until independent Travel
    parity tests pass.

## Next extraction boundary

The next phase will classify dependencies into:

- Travel-specific UI/runtime
- shared UI
- shared auth/runtime
- shared canonical data access
- shared domain services
- Control-Center-only dependencies

Only after that classification may the Travel runtime begin consuming
extracted executable modules.