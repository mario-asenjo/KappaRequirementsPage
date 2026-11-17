# Discovery unknown ID check

Command: `npm run check:discovery-unknown-ids`

Source IDs: exact 17 IDs documented in `docs/tarkov-2026-discovery.md`.

Method:

- Checked against regenerated `src/data/tasks.json` from `https://json.tarkov.dev/pve/tasks`.
- For IDs present in the PvE JSON catalog, the task name and wiki link from the structured row are used.
- For IDs still absent, MediaWiki ID search during verification did not resolve an exact task page; names are not invented.

| ID | Present in json.tarkov.dev PvE? | Resolved task name | Present/resolvable in Wiki/Fandom? | Classification |
|---|---:|---|---|---|
| `6834145ebc1f443d7603c8a7` | yes | Easy Money - Part 1 [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `6834158f2f0e2a7eb90b62c8` | yes | Easy Money - Part 2 [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `68341846186efa3c5b07f989` | yes | Balancing - Part 1 [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `68341a0b2f0e2a7eb90b62d4` | yes | Balancing - Part 2 [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `697878057aa1273126030fb0` | yes | Arena Business [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `69788d4e963f08d9140bce19` | yes | Professional Fitness - Part 1 [PVE ZONE] | yes, via structured task wikiLink | resolved |
| `69fa5e0f04087f435106b9c7` | no |  | no exact task page by ID search | absent-upstream |
| `6a1c766939a00fb24a0b8d25` | no |  | no exact task page by ID search | absent-upstream |
| `6a1c79503bec45f2d70000da` | no |  | no exact task page by ID search | absent-upstream |
| `6a39936fec86c6005a0656c1` | no |  | no exact task page by ID search | absent-upstream |
| `6a446573cd2959c3a609f2a9` | no |  | no exact task page by ID search | absent-upstream |
| `6a5424ae135497b9df0c68be` | yes | Fall Ailment | yes, via structured task wikiLink | resolved |
| `6a5c1578f2689567c30eb0f3` | yes | Hiking | yes, via structured task wikiLink | resolved |
| `6a5ccda873f06065630d61b0` | yes | Secret Message | yes, via structured task wikiLink | resolved |
| `6a5cd2178fd7c2b201032f3f` | yes | Demonstration Model | yes, via structured task wikiLink | resolved |
| `6a7637fed31fb1191903fc07` | no |  | no exact task page by ID search | absent-upstream |
| `6a91840a740be0cff50e0310` | no |  | no exact task page by ID search | absent-upstream |

Result: 10/17 discovery unknown IDs disappeared after migrating from the stale 499-task GraphQL snapshot to the 512-task PvE JSON catalog.

Unresolved IDs:

- `69fa5e0f04087f435106b9c7`
- `6a1c766939a00fb24a0b8d25`
- `6a1c79503bec45f2d70000da`
- `6a39936fec86c6005a0656c1`
- `6a446573cd2959c3a609f2a9`
- `6a7637fed31fb1191903fc07`
- `6a91840a740be0cff50e0310`
