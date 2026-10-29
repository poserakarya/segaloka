# Segaloka Travel — Phase 2G

## Purpose

Phase 2G defines the executable boundary contracts for the independent
Travel application.

This phase does NOT execute the copied V7 runtime.

## Locked rules

1. Travel is an independent application boundary.
2. Control Center is not part of the Travel runtime.
3. Existing V7 Travel UI/UX remains the parity source.
4. Existing `/p/travel` remains available until parity tests pass.
5. No fake authentication.
6. No role simulation.
7. No tenant simulation.
8. Hostname is routing context only, never authorization.
9. Authenticated user, membership, tenant and permission must be validated.
10. Database RLS remains mandatory.
11. Canonical business data must not be duplicated.
12. Canonical entity IDs must be preserved.
13. Payment, refund and settlement remain shared domain services.
14. Notifications and realtime synchronization remain cross-role services.
15. Travel may consume shared services but must not fork their canonical state.
16. Control-Center-only runtime must not enter the Travel application.
17. Reference runtime under `runtime/` remains reference-only.
18. `productionReady` remains false.

## Phase 2G output

- `contracts/app.contract.js`
- `contracts/auth.contract.js`
- `contracts/data.contract.js`
- `contracts/services.contract.js`
- `contracts/navigation.contract.js`

These files define extraction boundaries only.

They are deliberately not loaded by `travel.html` in Phase 2G.

## Next phase

Phase 2H may begin extracting the first executable Travel UI shell only
after these contracts and the original Control Center integrity are
validated.