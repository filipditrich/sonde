# Deployables: `engine` (supervised runtime), `web` (private operations cockpit), and `site` (independent public product site).

`site` is static-first and read-only. It imports no `@sonde/*` operational package and has no
database, control, or cockpit endpoint. See [ADR 0030](../docs/decisions/0030-public-product-site.md).

# See docs/architecture.md and docs/ui/first-screen.md.
