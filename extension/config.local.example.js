// config.local.example.js - Template of config.local.js (optional, git-ignored)
// Exposes: self.DuoGGLocalConfig
//
// Copy to config.local.js to share a connection string between several
// Chrome profiles that load this folder. Without this file, the connection
// string is typed in the popup (Neon tab).
//
// The value typed in the popup wins over this file.
// Only the service worker loads it (background.js): a content script never
// sees the connection string (docs/database/neon.md).
self.DuoGGLocalConfig = {
  // Connection string of the login role of the player, never the one of
  // neondb_owner: postgresql://duogg_player:<password>@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
  // Role created by db/create-role.sql, member of the duogg-user group.
  neonUrl: ''
};
