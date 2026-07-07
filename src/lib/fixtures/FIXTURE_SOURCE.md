# Fixture provenance

- Capability schemas verified live from
  https://hi.hirey.ai/v1/capabilities/hi.companies/schema and
  https://hi.hirey.ai/v1/capabilities/hi.agent-listings/schema on 2026-07-06
  (not vendored; fetch those URLs for the current source of truth).
- `listings-sample.json`: synthesized to match the live agent-listings schema
  (self.facts / target.roles / target.requirements canonical rows). Live POST
  probing of browse_recent was not possible from the build environment; verify
  field mappings against live data on first deploy (see spec "Known risk").
