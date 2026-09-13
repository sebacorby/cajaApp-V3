# Change Summary — v1.0.15

## Problem

Frontend endpoint identity mismatch: Playwright was hitting Diablo IV on port 11437 instead of CajaApp on 11437 because both startup scripts defaulted `FrontendPort = 3000`, and Diablo IV occupied 11437.

## Solution

Changed default `FrontendPort` from `3000` to `11437` in two startup scripts.

## Files Modified

1. `start-cajaapp.ps1` line 4:
   - Before: `[int]$FrontendPort = 3000,`
   - After: `[int]$FrontendPort = 11437,`

2. `cajaapp-headless-up.ps1` line 10:
   - Before: `[int]$FrontendPort = 3000,`
   - After: `[int]$FrontendPort = 11437,`

## Scope of Change

- Only startup scripts modified
- Backend, prompts, Prisma, productive frontend, package.json, lockfiles: frozen
- Minimal change to playwright.config.ts and ai-advisor.spec.ts (not needed)
