# Two-level Hub hierarchy with a single Canonical Parent

Collections form a two-level hierarchy: Hubs at the top, Sub-collections beneath, and a Hub never sits under another Hub. A Sub-collection may be listed under several Hubs, but its `custom.parent_collection` metafield names its one Canonical Parent, and that is the source of truth for breadcrumbs and BreadcrumbList structured data. A Hub's `custom.sub_collections` metafield is curated navigation only, and is deliberately not kept in sync with `parent_collection`.

## Considered Options

- **Strict tree (exactly one parent):** rejected, because the same Sub-collection often belongs in more than one product area (e.g. Folding E-Bikes under both E-Bikes and Folding Bikes).
- **Hub listings as the only source of the hierarchy:** rejected, because a Sub-collection listed in several Hubs would have an ambiguous breadcrumb and search-engine parent.

## Consequences

- The relationship lives in two metafields that point in opposite directions and can disagree. When they do, `parent_collection` wins.
- Hubs get no parent in breadcrumbs or structured data. Allowing nested Hubs would mean revisiting this decision.
