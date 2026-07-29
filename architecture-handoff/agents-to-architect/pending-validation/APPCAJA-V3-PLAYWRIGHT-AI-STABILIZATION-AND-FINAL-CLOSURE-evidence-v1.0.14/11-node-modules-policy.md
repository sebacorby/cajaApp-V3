# node_modules Policy

## Start of Campaign

1. Deleted both `node_modules` folders
2. Verified lockfile hashes
3. Executed `npm ci` separately for backend and frontend

## During Campaign

- node_modules created by `npm ci`
- node_modules used for builds and tests

## End of Campaign

1. Verified lockfiles unchanged
2. Deleted both `node_modules` folders
3. Verified node_modules absent

## Verification

- Backend node_modules: DELETED
- Frontend node_modules: DELETED
- Lockfiles: UNCHANGED
