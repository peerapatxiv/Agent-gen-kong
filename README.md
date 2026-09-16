# GW Ticket → Route YAML Generator

Convert a Jira **"Add Scope" / "Add Route"** ticket description into Kong route YAML —
both **Format A** (App-config style, `plugins` + `ValidateToken`) and **Format B**
(Kong Deck style, `${{ env "..." }}` templating) at once.

Everything runs client-side. Ticket text is parsed with a deterministic TypeScript
parser — no LLM/API call is involved in generating the YAML, and nothing you paste is
sent anywhere.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

Other scripts:

```bash
npm run build      # type-check + production build
npm run test        # run the unit test suite once
npm run test:watch  # run tests in watch mode
npm run lint         # oxlint
npm run preview      # preview the production build
```

## Using the app

1. Paste a Jira ticket (table or prose style) into **Jira Ticket / Description**, or
   pick one from **Load Example** — or use **Import from Jira URL** (see below).
2. Click **Generate YAML**. The parser detects external API routes, skips
   internal/excluded ones, and extracts methods, paths, scopes, plugins and domain.
3. Review **Detected Routes** — every field is editable inline (method, path, scopes,
   plugins, domain, description, tags). Edits regenerate both YAML formats immediately.
4. Check **Excluded Routes** to see which rows were skipped and why.
5. Switch between the **Format A** / **Format B** tabs in the output panel. Use
   **Copy YAML**, **Download YAML**, or **Download Both (.zip)**. A validity badge
   shows whether each document is structurally valid.
6. The **Validation** panel summarizes route counts and surfaces warnings (ambiguous
   method, missing version, possible query string, duplicate routes).

## Import from Jira URL

Enter your Jira email + [API token](https://id.atlassian.com/manage-profile/security/api-tokens),
paste a Jira issue link (e.g. `https://your-site.atlassian.net/browse/TGP-2214`) into
**Import from Jira URL**, and click **Fetch ticket**. This calls the issue's REST API
(`/rest/api/latest/issue/<KEY>?expand=renderedFields`, per
[Atlassian's guide to Jira REST API URLs](https://community.atlassian.com/forums/Jira-articles/Using-Jira-REST-API-URLs-to-Access-Data/ba-p/2814475))
directly from the browser with Basic Auth, converts the rendered HTML description back
into the same plain-text/table shape the parser reads from a manual paste, and runs it
through the normal parsing pipeline — no copy/paste needed when it works.

Your email/token are stored only in this browser's `localStorage` and are sent
directly to your Jira site with each request — never anywhere else, and never over
the network to any server this app controls (there is no server).

**Fallback:** Jira Cloud generally doesn't send CORS headers for arbitrary origins, so
the direct fetch can be blocked by the browser regardless of how valid the
credentials are — this is a decision made by Jira, not something the app can retry its
way around. When that happens (or when no credentials are entered), the app
automatically opens the same REST URL in a new tab — which works because it's a normal
browser navigation using your existing logged-in Jira session, not a script-driven
request — and reveals a box to paste the JSON response back into, restoring the same
result as a successful direct fetch.

## Parsing rules implemented

- **External vs internal**: rows are generated unless marked `Internal Service`,
  `Internal`, or `exclude(d)`.
- **Methods**: `GET/POST/PUT/DELETE/PATCH/OPTIONS/HEAD`, inline before a path, in a
  `Method(s):` field, or in a table column. Multiple methods (`GET, POST, PUT, DELETE`)
  are supported. If no method can be determined, the route is flagged rather than
  guessed.
- **Scopes**: `Required Scope(s)` / `Scope(s)` determine enforcement.
  `Generate Scope` is never used as a substitute. `-`, `none`, or empty means "no
  scope" — Format A omits `config.scopes`, Format B omits the `scope=` tag.
- **Plugins**: `ValidateToken` (default), `ValidateTokenIfApiAuth`, `TokenRevocation`,
  `CheckUserStatus`, `GenerateAndStoreToken`, `GenerateAndStoreTokenBySession`, and
  arbitrary custom plugin names. Multiple `Plugin:` lines are preserved in order, each
  with its own scope/status-code fields.
- **Naming**:
  - Format A: `<VERSION-uppercase>-<path-segments-as-written>-routes`
  - Format B: `<PascalCase-segments-concatenated>-${{ env "DECK_ENV" }}`
- **Format B** always uses the fixed `hosts` pair, the exact tag ordering
  (`route`, `${{ env "DECK_ENV" }}`, `project=scb-fasteasy-cloud`, `kong-ce2`, domain,
  methods, optional `scope=...`), and never emits `enabled` or `plugins`.

## Deployment

Pushes to `main` build the app and publish it to GitHub Pages automatically via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The build uses a
`/Agent-gen-kong/` base path (set via `GITHUB_PAGES=true npm run build`) to match this
repo's Pages URL: `https://peerapatxiv.github.io/Agent-gen-kong/`.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

To build the same way locally:

```bash
GITHUB_PAGES=true npm run build
npm run preview
```

## Architecture

```
src/
  components/      TicketInput, JiraUrlImport, RoutePreview, RouteEditor, YamlOutput,
                    FormatTabs, ValidationPanel, ui/ (Button, Badge, Card)
  parser/           ticketParser, routeParser, scopeParser, pluginParser, jiraImport
  generators/       formatA, formatB, nameGenerator, tagGenerator
  types/            RouteDefinition, PluginDefinition, ParseIssue, ParseResult
  utils/            normalization, yaml (validation), download (copy/ZIP)
  examples/         tickets.ts — 11 built-in example tickets
  hooks/            useTheme, useToast
```

The pipeline is a pure, deterministic function chain:

```
Jira ticket text
  → parseTicket()            (src/parser/ticketParser.ts)
  → RouteDefinition[]         (external routes) + excluded routes + issues
  → generateFormatA()         (src/generators/formatA.ts)
  → generateFormatB()         (src/generators/formatB.ts)
  → checkYamlSyntax() / validateFormatAYaml() / validateFormatBYaml()
                               (src/utils/yaml.ts)
```

`parser/` and `generators/` have no React dependency and are covered by the test
suite (`npm run test`) — 40+ tests including the worked examples from the ticket spec
(multiple external routes, internal exclusion, `businessAndMarital` casing
preservation, `TokenRevocation`, multi-plugin ordering, multiple methods, duplicate
detection, missing method/version flags, and Format B's exact tag/host/name rules).

## Tech stack

React + TypeScript + Vite, Tailwind CSS v4, CodeMirror (`@uiw/react-codemirror` +
`@codemirror/lang-yaml`) for syntax-highlighted output, `js-yaml` for syntax
validation, and Vitest for tests. No backend, no API keys.
