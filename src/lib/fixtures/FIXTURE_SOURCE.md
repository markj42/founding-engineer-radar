# Fixture provenance

- `capability-schema-companies.json`, `capability-schema-agent-listings.json`:
  fetched live from https://hi.hirey.ai/v1/capabilities/{id}/schema on 2026-07-06.
- `listings-sample.json`: synthesized to match the live agent-listings schema
  (self.facts / target.roles / target.requirements canonical rows). Live POST
  probing of browse_recent was not possible from the build environment; verify
  field mappings against live data on first deploy (see spec "Known risk").
