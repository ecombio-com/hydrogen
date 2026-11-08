# Skills audit

## architect
lines: 81 | files: 4
```yaml
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape."
disable-model-invocation: true
```

## arena
lines: 50 | files: 1
```yaml
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
```

## ask-matt
lines: 97 | files: 3
```yaml
name: ask-matt
description: Ask which skill or flow fits your situation. A router over the skills in this repo.
disable-model-invocation: true
```

## automate-me
lines: 106 | files: 1
```yaml
name: automate-me
description: "Use for \"automate me\", \"create/update/refresh my -mode skill\", \"turn/capture my preferences or working style into a skill\", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill via create-skill + unslop, optionally pulling fresh evidence from recent transcripts."
disable-model-invocation: true
```

## babysit
lines: 68 | files: 1
```yaml
name: babysit
description: Watch an open PR — fix failing CI, handle the straightforward review comments, and drive it to a mergeable state. Claude Code analog of Cursor's built-in /babysit. Use after opening a PR when the user wants the agent to shepherd it without re-prompting.
```

## benchmark-checklist
lines: 39 | files: 1
```yaml
name: benchmark-checklist
description: "Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it. Use when you run a benchmark or report a speedup or regression you measured."
disable-model-invocation: true
```

## blast-radius
lines: 50 | files: 1
```yaml
name: blast-radius
description: "Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a small diff you don't trust."
disable-model-invocation: true
```

## bro
lines: 7 | files: 1
```yaml
name: bro
description: Restate the last message in plain human language, with no jargon.
disable-model-invocation: true
```

## chief-of-staff
lines: 75 | files: 2
```yaml
name: chief-of-staff
description: Pursue a long-running goal in a single session by co-ordinating subagents.
disable-model-invocation: true
```

## claude-handoff
lines: 18 | files: 2
```yaml
name: claude-handoff
description: Hand the current conversation off to a fresh background agent that picks up the work immediately.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
```

## code-review
lines: 89 | files: 2
```yaml
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
```

## codebase-design
lines: 114 | files: 4
```yaml
name: codebase-design
description: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
```

## correct
lines: 32 | files: 1
```yaml
name: correct
description: "Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a test, and write docs last. Prove each check fails on a real past mistake. Repeat this each time the operator corrects you. Use for /correct."
disable-model-invocation: true
```

## create-formal-verification-skill
lines: 45 | files: 1
```yaml
name: create-formal-verification-skill
description: "Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool fits. Use for /create-formal-verification-skill, \"model-check this race\", \"prove this invariant\", or when concurrency, retries, state machines, parsers, or unsafe code need more than tests."
disable-model-invocation: true
```

## create-verification-skill
lines: 46 | files: 4
```yaml
name: create-verification-skill
description: "Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. Use for /create-verification-skill, \"make a control skill for this repo\", or when a project has no scripted way to prove UI/CLI/service behavior."
disable-model-invocation: true
```

## deslop
lines: 24 | files: 1
```yaml
name: deslop
description: Remove AI-generated code slop and clean up code style
```

## diagnosing-bugs
lines: 138 | files: 3
```yaml
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
```

## domain-modeling
lines: 74 | files: 4
```yaml
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR.
```

## figure-it-out
lines: 54 | files: 1
```yaml
name: figure-it-out
description: "Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-it-out or 'figure it out'."
disable-model-invocation: true
```

## fix-ci
lines: 29 | files: 1
```yaml
name: fix-ci
description: Find failing PR checks, inspect logs or external check links, and apply focused fixes
```

## fix-merge-conflicts
lines: 32 | files: 1
```yaml
name: fix-merge-conflicts
description: Resolve merge conflicts non-interactively, validate build and tests, and finalize conflict resolution
```

## get-pr-comments
lines: 23 | files: 1
```yaml
name: get-pr-comments
description: Fetch and summarize review comments from the active pull request
```

## git-guardrails-claude-code
lines: 95 | files: 3
```yaml
name: git-guardrails-claude-code
description: Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Claude Code.
```

## grill-me
lines: 7 | files: 2
```yaml
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
```

## grill-with-docs
lines: 7 | files: 2
```yaml
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
```

## grilling
lines: 30 | files: 2
```yaml
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
```

## handoff
lines: 16 | files: 2
```yaml
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
```

## how
lines: 38 | files: 3
```yaml
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
```

## implement
lines: 17 | files: 2
```yaml
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
```

## implement-spec
lines: 42 | files: 2
```yaml
name: implement-spec
description: "Implement the result of /to-spec and /to-tickets in code."
disable-model-invocation: true
```

## improve-codebase-architecture
lines: 71 | files: 3
```yaml
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
disable-model-invocation: true
```

## in-your-own-words
lines: 7 | files: 1
```yaml
name: in-your-own-words
description: "Restate in your own words what you think the user's goals are and what problem they're trying to solve. Use for /in-your-own-words."
disable-model-invocation: true
```

## interrogate
lines: 33 | files: 1
```yaml
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Adversaries try to break a change or design, and only findings proven by a run survive."
disable-model-invocation: true
```

## ketchup
lines: 43 | files: 1
```yaml
name: ketchup
description: "Catch the user up on what changed in this chat since their last message, in plain words and small visuals. List every item waiting on them with what they need to decide it from the reply alone. Use for /ketchup."
disable-model-invocation: true
```

## loop-me
lines: 32 | files: 2
```yaml
name: loop-me
description: Grill me about specs for the workflows I want to build, within this workspace.
disable-model-invocation: true
argument-hint: "A workflow to design, or nothing to go find one"
```

## maintain-formal-verification-skill
lines: 60 | files: 1
```yaml
name: maintain-formal-verification-skill
description: "Bring a project's formal verification back in line with the code after the code changes: find the commits that touched verified code, update the model, harness, or properties to describe the code as it is now, rerun, and say whether each failure is drift in the verification or a bug in the code. Use for /maintain-formal-verification-skill, \"is the model still true to the code\", or after merges and refactors that touched verified code without rechecking it."
disable-model-invocation: true
```

## maintain-verification-skill
lines: 41 | files: 1
```yaml
name: maintain-verification-skill
description: "Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections. Use for /maintain-verification-skill or \"audit the verify skill\"."
disable-model-invocation: true
```

## make-pr-easy-to-review
lines: 59 | files: 1
```yaml
name: make-pr-easy-to-review
description: Prepare PRs for review by cleaning noisy history, improving PR descriptions, and adding reviewer guidance without changing code behavior. Use for "make this easy to review", "tidy this PR", "clean up commits", or "annotate the diff".
```

## no-comments
lines: 26 | files: 1
```yaml
name: no-comments
description: "Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints."
disable-model-invocation: true
```

## poteto-help
lines: 165 | files: 3
```yaml
name: poteto-help
description: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question.
disable-model-invocation: true
```

## poteto-mode
lines: 152 | files: 43
```yaml
name: poteto-mode
description: poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style.
disable-model-invocation: true
icon: crown
color: yellow
```

## pr
lines: 170 | files: 3
```yaml
name: pr
description: "Use when writing a PR body."
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
```

## principle-attack-the-premise
lines: 21 | files: 1
```yaml
name: principle-attack-the-premise
description: "Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it."
disable-model-invocation: true
```

## principle-boundary-discipline
lines: 34 | files: 1
```yaml
name: principle-boundary-discipline
description: "Apply when wiring validation, error handling, or framework adapters. Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions."
disable-model-invocation: true
```

## principle-build-the-lever
lines: 23 | files: 1
```yaml
name: principle-build-the-lever
description: "Apply to any non-trivial work, not just bulk work: edits, migrations, analyses, checks. Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand. The tool is the artifact a reviewer can rerun."
disable-model-invocation: true
```

## principle-encode-lessons-in-structure
lines: 11 | files: 1
```yaml
name: principle-encode-lessons-in-structure
description: "Apply when you catch yourself writing the same instruction a second time, or notice a recurring correction. Encode the rule as a lint, metadata flag, runtime check, or script instead of more text."
disable-model-invocation: true
```

## principle-exhaust-the-design-space
lines: 9 | files: 1
```yaml
name: principle-exhaust-the-design-space
description: "Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing."
disable-model-invocation: true
```

## principle-experience-first
lines: 19 | files: 1
```yaml
name: principle-experience-first
description: "Apply when product, UX, or feature-scope tradeoffs come up. Choose user delight over implementation convenience; ship fewer polished features over more rough ones."
disable-model-invocation: true
```

## principle-explain-the-number
lines: 18 | files: 1
```yaml
name: principle-explain-the-number
description: "Apply before you measure, and before you trust, report, or act on a number you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and rule out that it measured something other than the work you think."
disable-model-invocation: true
```

## principle-fix-root-causes
lines: 21 | files: 1
```yaml
name: principle-fix-root-causes
description: "Apply when debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate."
disable-model-invocation: true
```

## principle-foundational-thinking
lines: 21 | files: 1
```yaml
name: principle-foundational-thinking
description: "Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious."
disable-model-invocation: true
```

## principle-guard-the-context-window
lines: 12 | files: 1
```yaml
name: principle-guard-the-context-window
description: "Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads."
disable-model-invocation: true
```

## principle-laziness-protocol
lines: 10 | files: 1
```yaml
name: principle-laziness-protocol
description: "Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem."
disable-model-invocation: true
```

## principle-make-operations-idempotent
lines: 22 | files: 1
```yaml
name: principle-make-operations-idempotent
description: "Apply when designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs."
disable-model-invocation: true
```

## principle-migrate-callers-then-delete-legacy-apis
lines: 14 | files: 1
```yaml
name: principle-migrate-callers-then-delete-legacy-apis
description: "Apply when introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers."
disable-model-invocation: true
```

## principle-minimize-reader-load
lines: 18 | files: 1
```yaml
name: principle-minimize-reader-load
description: "Apply when reviewing or shaping code that's hard to trace. Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope."
disable-model-invocation: true
```

## principle-model-the-domain
lines: 24 | files: 1
```yaml
name: principle-model-the-domain
description: "Apply when writing stateful logic, or when code branches a lot or repeats a shape assumption across files."
disable-model-invocation: true
```

## principle-never-block-on-the-human
lines: 15 | files: 1
```yaml
name: principle-never-block-on-the-human
description: "Apply when tempted to ask 'should I do X?' on reversible work."
disable-model-invocation: true
```

## principle-outcome-oriented-execution
lines: 21 | files: 1
```yaml
name: principle-outcome-oriented-execution
description: "Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code."
disable-model-invocation: true
```

## principle-prove-it-works
lines: 24 | files: 1
```yaml
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
disable-model-invocation: true
```

## principle-redesign-from-first-principles
lines: 16 | files: 1
```yaml
name: principle-redesign-from-first-principles
description: "Apply when integrating a new requirement into an existing design."
disable-model-invocation: true
```

## principle-separate-before-serializing-shared-state
lines: 16 | files: 1
```yaml
name: principle-separate-before-serializing-shared-state
description: "Apply when concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant."
disable-model-invocation: true
```

## principle-sequence-verifiable-units
lines: 17 | files: 1
```yaml
name: principle-sequence-verifiable-units
description: "Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer."
disable-model-invocation: true
```

## principle-subtract-before-you-add
lines: 18 | files: 1
```yaml
name: principle-subtract-before-you-add
description: "Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base."
disable-model-invocation: true
```

## principle-test-behavior-not-implementation
lines: 20 | files: 1
```yaml
name: principle-test-behavior-not-implementation
description: "Apply when you write, change, or keep a test. Assert what the code's users can observe, so that the test fails when that behavior breaks and keeps passing when only the internals change."
disable-model-invocation: true
```

## principle-type-system-discipline
lines: 13 | files: 1
```yaml
name: principle-type-system-discipline
description: "Apply when designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas."
disable-model-invocation: true
```

## prototype
lines: 26 | files: 4
```yaml
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
```

## recall
lines: 37 | files: 1
```yaml
name: recall
description: "Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. Use for 'recall my work on X', 'catch me up', 'what have I been working on', 'where did I leave off', before starting or resuming work."
disable-model-invocation: true
```

## reflect
lines: 71 | files: 5
```yaml
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
```

## research
lines: 12 | files: 2
```yaml
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
```

## retro
lines: 44 | files: 2
```yaml
name: retro
description: "Conduct a retrospective on a coding session."
disable-model-invocation: true
```

## setup-matt-pocock-skills
lines: 120 | files: 7
```yaml
name: setup-matt-pocock-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills."
disable-model-invocation: true
```

## setup-pre-commit
lines: 91 | files: 2
```yaml
name: setup-pre-commit
description: Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.
```

## setup-pstack
lines: 80 | files: 1
```yaml
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
```

## setup-ts-deep-modules
lines: 102 | files: 3
```yaml
name: setup-ts-deep-modules
description: Wire dependency-cruiser into a TypeScript repo so each package is a deep module, with implementation hidden in subfolders and reachable only through its entry-point files. User-invoked.
disable-model-invocation: true
```

## sharpen
lines: 16 | files: 1
```yaml
name: sharpen
description: "Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen."
disable-model-invocation: true
```

## shopify
lines: 124 | files: 145
```yaml
name: shopify
description: "Build anything on Shopify. One skill covering every Shopify developer surface: Flow workflows, Use Shopify CLI, Admin API, ShopifyQL, Storefront GraphQL API, Partner API, Customer Account API, Payments Apps API, Shopify Functions, Polaris App Home, Polaris Admin Extensions, Polaris Checkout Extensions, Polaris Customer Account Extensions, POS UI, Hydrogen, Liquid, Custom Data, Shopify App Pricing, App Store Review, Developer Onboarding, Merchant Onboarding. Use it for any Shopify API, extension, theme, storefront, function, or CLI task — writing or explaining code, looking up operations, fields, components and valid values, validating generated code, and choosing which surface a request belongs to. Also use it when someone asks to make, build, open, or set up a store or shop that sells something, and when a prompt mentions or asks for any of: metafields or metaobjects, make me a store that sells pet supplies, mock.shop reference stores, build a storefront without an account — even without saying Shopify."
compatibility: Requires Node.js
metadata:
  author: Shopify
  version: "1.19.0"
hooks:
  PostToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: 'sh -c ''h="$CLAUDE_PLUGIN_ROOT/scripts/track-telemetry.sh"; if [ -f "$h" ]; then exec bash "$h"; fi'''
```

## show-me-your-work
lines: 84 | files: 3
```yaml
name: show-me-your-work
description: "Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /show-me-your-work, autonomous or multi-phase runs, or work a human reviews after stepping away."
disable-model-invocation: true
```

## statechart
lines: 82 | files: 407
```yaml
name: statechart
description: "Check a TLA+ model of a system that moves between states, such as a product flow, a protocol, or a service, and draw it as a Mermaid statechart. The report gives the shortest path to each state that breaks a rule. Use for /statechart, or to show a bug as a path through states."
disable-model-invocation: true
```

## swarm
lines: 43 | files: 1
```yaml
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
```

## tdd
lines: 42 | files: 1
```yaml
name: tdd
description: "Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested."
disable-model-invocation: true
```

## teach
lines: 23 | files: 1
```yaml
name: teach
description: "Explain a body of work plainly so a person actually understands it. Runs the `how` and `why` skills and weaves what they find into one clear explanation. Use for 'teach me this', 'help me really understand X', 'explain this change or subsystem to me'."
disable-model-invocation: true
```

## technical-writing
lines: 108 | files: 1
```yaml
name: technical-writing
description: "Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. Use for /technical-writing or when writing or reviewing docs, RFCs, readmes, PR descriptions, or commit messages."
disable-model-invocation: true
```

## thermo-nuclear-code-quality-review
lines: 201 | files: 1
```yaml
name: thermo-nuclear-code-quality-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, and spaghetti-condition growth. Use for a thermo-nuclear code quality review, thermonuclear review, deep code quality audit, or especially harsh maintainability review.
```

## thermo-nuclear-review
lines: 50 | files: 1
```yaml
name: thermo-nuclear-review
description: Comprehensive security and correctness audit of a branch's changes. Use for thermo nuclear, thermonuclear, or deep review requests, or branch/PR diff audits focused on bugs, breaking changes, security issues, devex regressions, and feature-gate leaks.
```

## thermos
lines: 40 | files: 1
```yaml
name: thermos
description: "Launch both thermo-nuclear review subagents in parallel, then synthesize their findings. Use for thermos, double thermo review, or combined bug/security and code-quality branch audits."
```

## to-questionnaire
lines: 54 | files: 2
```yaml
name: to-questionnaire
description: Turn a decision you can't fully answer into a questionnaire for someone else to fill in.
disable-model-invocation: true
```

## to-spec
lines: 75 | files: 2
```yaml
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
disable-model-invocation: true
```

## to-tickets
lines: 105 | files: 2
```yaml
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker).
disable-model-invocation: true
```

## triage
lines: 112 | files: 4
```yaml
name: triage
description: Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs.
disable-model-invocation: true
```

## typescript-best-practices
lines: 31 | files: 2
```yaml
name: typescript-best-practices
description: TypeScript best practices. Use when reading or editing any .ts or .tsx file.
paths: ["**/*.ts", "**/*.tsx"]
disable-model-invocation: true
```

## unslop
lines: 62 | files: 1
```yaml
name: unslop
description: Cut AI tells from any writing.
disable-model-invocation: true
```

## wait-what
lines: 7 | files: 2
```yaml
name: wait-what
description: "Stop. That last message did not land: re-pitch it."
disable-model-invocation: true
```

## wayfinder
lines: 128 | files: 2
```yaml
name: wayfinder
description: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
```

## what-did-i-get-done
lines: 31 | files: 1
```yaml
name: what-did-i-get-done
description: Summarize authored commits over a user-specified time period into a concise update
```

## why
lines: 100 | files: 13
```yaml
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
disable-model-invocation: true
```

## wizard
lines: 44 | files: 3
```yaml
name: wizard
description: Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.
```

## writing-beats
lines: 67 | files: 2
```yaml
name: writing-beats
description: Writing, exploit; assemble raw material into a journey of beats, grounding each term before a beat leans on it.
disable-model-invocation: true
```

## writing-for-agents
lines: 81 | files: 3
```yaml
name: writing-for-agents
description: Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.
```

## writing-fragments
lines: 79 | files: 2
```yaml
name: writing-fragments
description: "Writing, explore: mine raw fragments, no structure yet."
disable-model-invocation: true
```

## writing-shape
lines: 79 | files: 2
```yaml
name: writing-shape
description: "Writing, exploit: shape raw material into an article, paragraph by paragraph."
disable-model-invocation: true
```

## skills-lock.json
```json
{
  "version": 1,
  "skills": {
    "architect": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/architect/SKILL.md",
      "computedHash": "aec748165db00334961e9091cc3055583d50cf7fd71952446974877143cf5da3"
    },
    "arena": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/arena/SKILL.md",
      "computedHash": "f10bf93a21015a90f6d7c84934e05c6c4b3b4b7932baabcbb8f0a985979bbf31"
    },
    "ask-matt": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/ask-matt/SKILL.md",
      "computedHash": "9eead017d1708983aea08e98edc915defe7bf23719ac053ca98ab53dc518bd52"
    },
    "automate-me": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/automate-me/SKILL.md",
      "computedHash": "a6ecf09a793712b763cf1c775ccb18b645220730eb3cd133a3d3c95016605196"
    },
    "babysit": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/babysit/SKILL.md",
      "computedHash": "12265c3b968c2f5eb2541c7558945272076a74bc2700e63bab6a8db23acad231"
    },
    "benchmark-checklist": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/benchmark-checklist/SKILL.md",
      "computedHash": "0413fcdbb5e8b5c93b1e626e1ecce5d0bf06fbc1d89555ddb44fd7450842b264"
    },
    "blast-radius": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/blast-radius/SKILL.md",
      "computedHash": "5b02650462b32f80d62c057c636d738ebaaa5da4b78b9056272b549fbc09eb90"
    },
    "bro": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/bro/SKILL.md",
      "computedHash": "33f023f92c4e4ec96049908962310c48826afc871b346a2751f493213249a013"
    },
    "chief-of-staff": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/chief-of-staff/SKILL.md",
      "computedHash": "4e46e888b6069dc9a21a0ee4b7748b96b5f14c4c2a4d587f0c5b85e02a88f085"
    },
    "claude-handoff": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/claude-handoff/SKILL.md",
      "computedHash": "7286edfcb9237c72b3bd96cdab1d6a515f529b25380923569924b96d2d265701"
    },
    "code-review": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/code-review/SKILL.md",
      "computedHash": "c2e0695f4d6bb9e1cc0b4c68d9965d062271cff387000fa59c1c2d31a18c25b8"
    },
    "codebase-design": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/codebase-design/SKILL.md",
      "computedHash": "417e3ea96ab3fbe2b7a4279ce3e59202fb7106ad688c12f2d577c9219803de8d"
    },
    "correct": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/correct/SKILL.md",
      "computedHash": "f23e86ec27e1f0e1df814087be36b030c11e387f8a774478a83a18b9234ad529"
    },
    "create-formal-verification-skill": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/create-formal-verification-skill/SKILL.md",
      "computedHash": "a31c538d65c1896e0e59f983e658ba2988a42b7afb914d0ab81899686eb95f28"
    },
    "create-verification-skill": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/create-verification-skill/SKILL.md",
      "computedHash": "d1dfd80236ed094819ef3713de80945667e46b7d851cd29107572f96e34bdba2"
    },
    "deslop": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/deslop/SKILL.md",
      "computedHash": "2c79c630f991f32a94fa59033c2da05479e96b1cc27a0b0c9e4bdbaf0553acc4"
    },
    "diagnosing-bugs": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/diagnosing-bugs/SKILL.md",
      "computedHash": "aec3686657177071076dc1586c22cdf95137c230bc74cbb5d069903d73804817"
    },
    "domain-modeling": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/domain-modeling/SKILL.md",
      "computedHash": "f377a1341e1b368833cfe5889ace3e61d7df48d7a9e5da9253dba75d062bbfbc"
    },
    "figure-it-out": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/figure-it-out/SKILL.md",
      "computedHash": "580b4c9cce3c7f2aa92f378552bcf0686d63024a27bc76376bbdb79193205c36"
    },
    "fix-ci": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/fix-ci/SKILL.md",
      "computedHash": "4fd612543072facaaf7193c3a28cef12507ba6826d3a533836b1c9cc1c511e53"
    },
    "fix-merge-conflicts": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/fix-merge-conflicts/SKILL.md",
      "computedHash": "8404e1b711c7da7a35049ecb6e722af7da64af849ff61d6b1ebcaac046f3f35e"
    },
    "get-pr-comments": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/get-pr-comments/SKILL.md",
      "computedHash": "598f4df0600f25edbafb5a15933869ae967d35c5d2309279f1c3755cbbf78667"
    },
    "git-guardrails-claude-code": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/misc/git-guardrails-claude-code/SKILL.md",
      "computedHash": "fa22f1aa2708d95cc3149640f33e085381b184a0322609930f7971c1dca11835"
    },
    "grill-me": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/grill-me/SKILL.md",
      "computedHash": "5e0c683385eafd83f106ac6c9d67dfbbfe5aa4b3fe65aad114eb1055a99c818f"
    },
    "grill-with-docs": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/grill-with-docs/SKILL.md",
      "computedHash": "a610223c9796f755b603f15ec114849a4b38b9ba3006acfa9bdf3cc56dd44dad"
    },
    "grilling": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/grilling/SKILL.md",
      "computedHash": "a57d6b820c3b10700fd7de8ea1199bb0d42bc194df9f10baec4a6ed6a9686448"
    },
    "handoff": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/handoff/SKILL.md",
      "computedHash": "00e2d31992d62490083ed2fa2fc2a4418362f765875a59e7a3dc52836f826ab2"
    },
    "how": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/how/SKILL.md",
      "computedHash": "6dcb8a225b6ec33123996f43ead93fb7b97b205de1c3b7381dcebefca04ecbb1"
    },
    "implement": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/implement/SKILL.md",
      "computedHash": "141e77647388ad7d716a8f992b604872df0cbf6cdfbc8fa2a02cbc9fe67160fc"
    },
    "implement-spec": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/implement-spec/SKILL.md",
      "computedHash": "b2f5c6fd6a1a9d025500db2350c30edd2673c3bd57d08396f104a2a592d4dffb"
    },
    "improve-codebase-architecture": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/improve-codebase-architecture/SKILL.md",
      "computedHash": "11cfd9568d71445df710d5a9332c674ad773de0c9d5fc22d3ffa175bdd7d988b"
    },
    "in-your-own-words": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/in-your-own-words/SKILL.md",
      "computedHash": "2528d14039f6d36cadb0c9fd702daa0b3a997a482b070fd8e588295be2d9e2b0"
    },
    "interrogate": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/interrogate/SKILL.md",
      "computedHash": "9aeed84484adf009ebd2e1e1398b7e58a4607e76f8ca34d3b873055b49b3578c"
    },
    "ketchup": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/ketchup/SKILL.md",
      "computedHash": "e5b3f3fc549efbd1e38de10743249a71c28be4aa14760a67aeafa7286134b5aa"
    },
    "ketchup-video": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/ketchup-video/SKILL.md",
      "computedHash": "c8ec69d4b2afa9231c1bee2cdc7591831d65917bb4222a83b378b66c3405e566"
    },
    "loop-me": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/loop-me/SKILL.md",
      "computedHash": "d7fbcf41b5af203a6f2a7937afaaaebdd9941b0aa4cc3654b52daec01d3fb564"
    },
    "maintain-formal-verification-skill": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/maintain-formal-verification-skill/SKILL.md",
      "computedHash": "5de871fa59ab791f36ce440dd0aee682d19401d009046157a64ac58a3e1f424d"
    },
    "maintain-verification-skill": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/maintain-verification-skill/SKILL.md",
      "computedHash": "d9d8d11312902a59520634481ed8682c3415a8c118e74ab22d1dcf891cda92c6"
    },
    "make-bot-ui": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/make-bot-ui/SKILL.md",
      "computedHash": "4cc242f9ce597c2bec57dd59aafe72e23942d0f946e2393054e0f570258ce89f"
    },
    "make-pr-easy-to-review": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/make-pr-easy-to-review/SKILL.md",
      "computedHash": "8b3e62ce5609388731966d66725a0962e6d6c249bf384b84e131eb24de3c2b27"
    },
    "migrate-to-shoehorn": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/misc/migrate-to-shoehorn/SKILL.md",
      "computedHash": "7d31e494a384d1a5b88d1dec6e1f50e673ef1a60f7b0b6e92babfbb242f79b62"
    },
    "no-comments": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/no-comments/SKILL.md",
      "computedHash": "4f45ed45b89b4217184e1657fbd95261aad69ed761be3542b6aa80c71db40f18"
    },
    "origin-api": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "origin-apps/skills/origin-api/SKILL.md",
      "computedHash": "aa7ced578736fa38c74e9970f3df6dda22c5243ecdeb888736218df74c663fb6"
    },
    "port-github-app-to-origin": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "origin-apps/skills/port-github-app-to-origin/SKILL.md",
      "computedHash": "29f94b5be1dd1d79890e1218401c4f3fbf5a66703d487db21f9d16dda70fa5f6"
    },
    "poteto-help": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/poteto-help/SKILL.md",
      "computedHash": "a4c1036bde5ae1102e336b702553da97ea15ca38a956ae7917c7edf3ef8da047"
    },
    "poteto-mode": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/poteto-mode/SKILL.md",
      "computedHash": "fad58b0af3fda2f17a67271150be09df341c7043fbab7a5b625adfb21fbc292e"
    },
    "pr": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/pr/SKILL.md",
      "computedHash": "e6e63bada1f038e0b5488f8b62f77ebbd36c97669ddc5afaffcd17f974709f9a"
    },
    "principle-attack-the-premise": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-attack-the-premise/SKILL.md",
      "computedHash": "52c5d2df15c8354fbdade99ad9ad203b3b25febc87537dd519e7e625bb3e6940"
    },
    "principle-boundary-discipline": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-boundary-discipline/SKILL.md",
      "computedHash": "ef41b691cc5131b600f21915b97efd17c61d7b49bc2c3a3b65f8b9d063ea0f65"
    },
    "principle-build-the-lever": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-build-the-lever/SKILL.md",
      "computedHash": "15b0b2a603a55faa8a12b25f04b1f1532019e4f605c78fc14b9edbd4290398f1"
    },
    "principle-encode-lessons-in-structure": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-encode-lessons-in-structure/SKILL.md",
      "computedHash": "6c4769efa049cb2fa3957e9e1b4fbb8cf0061c00f31795f21ada296484a37417"
    },
    "principle-exhaust-the-design-space": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-exhaust-the-design-space/SKILL.md",
      "computedHash": "d0613cb7162dca3937ab7c6ef9736dd42557edbcdabd77eb97d4050c93cbffa8"
    },
    "principle-experience-first": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-experience-first/SKILL.md",
      "computedHash": "298790b1cda88add6fccb19546414fe85a8cc3d43867194d8c699b00420836ec"
    },
    "principle-explain-the-number": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-explain-the-number/SKILL.md",
      "computedHash": "32c91346669e70636c087a0b2345d1cbea8a1b78d7cc44d41b45927528da6ba1"
    },
    "principle-fix-root-causes": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-fix-root-causes/SKILL.md",
      "computedHash": "307d375ef02bb20c4904ade197f9ede31b49ff6d4407ee613efd5a07fe0d0ad9"
    },
    "principle-foundational-thinking": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-foundational-thinking/SKILL.md",
      "computedHash": "8897b60a116beceafedbe8c5b7384f8d301b81abd0725364c41431dda4a0bf47"
    },
    "principle-guard-the-context-window": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-guard-the-context-window/SKILL.md",
      "computedHash": "89af7bbe0d31d60bd10f054abba0d3fb5099940a49f7e8fa62684d0113ace53c"
    },
    "principle-laziness-protocol": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-laziness-protocol/SKILL.md",
      "computedHash": "ec025788ec29629cee202f1dbb3e0a10e8e97d6fdd8a9b92c3a3f2f914af4f85"
    },
    "principle-make-operations-idempotent": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-make-operations-idempotent/SKILL.md",
      "computedHash": "cdf6de05f9ed7fa60d329f028097f40beffba85b24e1da1503553c614f9523f1"
    },
    "principle-migrate-callers-then-delete-legacy-apis": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md",
      "computedHash": "cc8802031d139a7a4074302b66595d56c6df9882365fe6927c34775dd1af1b69"
    },
    "principle-minimize-reader-load": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-minimize-reader-load/SKILL.md",
      "computedHash": "b9239d0ec6e7ac93e687aa123b64600716ee911b054915c6cb5208358c7e2294"
    },
    "principle-model-the-domain": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-model-the-domain/SKILL.md",
      "computedHash": "22c7b9188efc9259a3cfcc4194556dabe220621b67bc95b55da4a03c352243ab"
    },
    "principle-never-block-on-the-human": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-never-block-on-the-human/SKILL.md",
      "computedHash": "55ad38f862384c5f6ec88e36c11f35f5c2e2905c879366f9b1baded6fe96b31f"
    },
    "principle-outcome-oriented-execution": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-outcome-oriented-execution/SKILL.md",
      "computedHash": "ff17ea55335750db55a95214c418c344d50df46bb35786aa761e35c51c0a5a38"
    },
    "principle-prove-it-works": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-prove-it-works/SKILL.md",
      "computedHash": "d6ef96529a1e51843f1dcd32608bfda39113e5c01bf5fe6de5ea6c39c1f6b484"
    },
    "principle-redesign-from-first-principles": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-redesign-from-first-principles/SKILL.md",
      "computedHash": "07c0dbfec8993a8321136ddbcbcef241e0e45ebf11f4755883b0f82497cdf7b4"
    },
    "principle-separate-before-serializing-shared-state": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-separate-before-serializing-shared-state/SKILL.md",
      "computedHash": "c0aeded6850456b06d886f6332c2d760700489272e3aed92c307802c7133fb9c"
    },
    "principle-sequence-verifiable-units": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-sequence-verifiable-units/SKILL.md",
      "computedHash": "8e139cd9fa9897acc809486873faa68c80805472adba202f88f82e6b6816643b"
    },
    "principle-subtract-before-you-add": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-subtract-before-you-add/SKILL.md",
      "computedHash": "f844ee88e48eb55395d789679a4529f06d23d1994cb2f7ed33a5f03a2cfb832a"
    },
    "principle-test-behavior-not-implementation": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-test-behavior-not-implementation/SKILL.md",
      "computedHash": "7e8b080f15d204db1d28b82c07b869bbe7e10e7da99a2e97b3510bea4e77de26"
    },
    "principle-type-system-discipline": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/principle-type-system-discipline/SKILL.md",
      "computedHash": "6f6a325bcf1d45af7f233ca173af30b7f47f5d47a0e6d8c0eba0c1e5d77a9faa"
    },
    "prototype": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/prototype/SKILL.md",
      "computedHash": "62979fe039ef64407b258f8824db41b9185f788638747df803032df4153c2aae"
    },
    "recall": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/recall/SKILL.md",
      "computedHash": "8cad29999b0682ba02e4b40645055d3ecac8a54ad3e3ed8bd8b397599ddcd70a"
    },
    "reflect": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/reflect/SKILL.md",
      "computedHash": "9f58afe3871fbebd38933e0ac598e536486a714fca8d3c047855d0e8d7427d69"
    },
    "research": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/research/SKILL.md",
      "computedHash": "c219850f3a5effcdf4180ca550e92a375fbc8b5b1ec999f68804c37351363018"
    },
    "retro": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/retro/SKILL.md",
      "computedHash": "e63bb774fba4e601edfffc56bbd5c938d76c8faa2dff49456dff3b1e679cd3b6"
    },
    "scaffold-exercises": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/misc/scaffold-exercises/SKILL.md",
      "computedHash": "0f8154a7be9fc5ebe6ae0550d520259fadfdd512c166cb7f137f8e697aae4017"
    },
    "setup-matt-pocock-skills": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/setup-matt-pocock-skills/SKILL.md",
      "computedHash": "a7107058cd22442215320bb4282a7d8623aeabc7fbf9817b560c5464f34efd51"
    },
    "setup-pre-commit": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/misc/setup-pre-commit/SKILL.md",
      "computedHash": "4ae1ad6988eb61dbc600627bc12e061215d96ced504632d00f0d9de5905eadfa"
    },
    "setup-pstack": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/setup-pstack/SKILL.md",
      "computedHash": "82e38a3209248df3fb0e407955518f64097b1ffac5035023d60cab1314f1515a"
    },
    "setup-ts-deep-modules": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/setup-ts-deep-modules/SKILL.md",
      "computedHash": "0b0e7124ad1272d59e44bcb4224275e76421351294a91480ada62234158c1023"
    },
    "sharpen": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/sharpen/SKILL.md",
      "computedHash": "58881c7c2346cfa76d95d078d9f8b45043bac3d7d6a4273399aba5011a1696e4"
    },
    "shopify": {
      "source": "Shopify/shopify-ai-toolkit",
      "sourceType": "github",
      "skillPath": "skills/shopify/SKILL.md",
      "computedHash": "f97082edd282a04ee503059f4dd0e969ba96c6faabdedaf81912ff74f3a1d757"
    },
    "show-me-your-work": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/show-me-your-work/SKILL.md",
      "computedHash": "0f48ed41a68e88172913e02061e7115e48b5a0a6a1244bba511092d5f9ab03c5"
    },
    "statechart": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/statechart/SKILL.md",
      "computedHash": "85941e8c56b58a82ebc25fb14865fe1599147817c31e473e8dd08f53fd9a8628"
    },
    "swarm": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/swarm/SKILL.md",
      "computedHash": "e1b4d59ab1307c616d8ae958fd9bf0e775785a6f2295e986097890e93c2c0c30"
    },
    "tdd": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/tdd/SKILL.md",
      "computedHash": "e2e272042cd38211874f68d3a0de8b7fcfd2062e65ccef3bfd1160c42139599f"
    },
    "teach": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/teach/SKILL.md",
      "computedHash": "9a8c54e787030a12f3f1ab14e7954dc71d0e78521fda900f7a77f34a48725234"
    },
    "technical-writing": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/technical-writing/SKILL.md",
      "computedHash": "3c9a64122cd38c6018c35d9fbad35be23ccf0ea17396e8bdcb72d38c0b860fa5"
    },
    "thermo-nuclear-code-quality-review": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/thermo-nuclear-code-quality-review/SKILL.md",
      "computedHash": "a77a52aa74e36cc268152d7398428d0509936a7db252b9e077e1bc90c47bab3e"
    },
    "thermo-nuclear-review": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/thermo-nuclear-review/SKILL.md",
      "computedHash": "3f2b96747ae7efbc4c6dffce3858920bbbe30fada5ef5de51a3eea589f8c3eb4"
    },
    "thermos": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/thermos/SKILL.md",
      "computedHash": "3f8e876203d84847596882de52d17a8a536664ec107831dad164b32b03c1f7bc"
    },
    "to-questionnaire": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/to-questionnaire/SKILL.md",
      "computedHash": "e2cb00bfeb4243f1384bf7e106185ccb69fd7d45ff6a3b04bec4102f505aba31"
    },
    "to-spec": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/to-spec/SKILL.md",
      "computedHash": "0ee8caf20fc7df94db53e76f42588fb01eee88c6f8dc97e7a3a0565be8978e74"
    },
    "to-tickets": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/to-tickets/SKILL.md",
      "computedHash": "f7d1bca83f85e4880eec5ed4fe0bff5b8ad1ba14f1e0b17dd0f6d9235a461ec4"
    },
    "triage": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/triage/SKILL.md",
      "computedHash": "453a7a098edcbec2a6ef67f8aa6720433672ebdf93023c90cefa79f160c72599"
    },
    "typescript-best-practices": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/typescript-best-practices/SKILL.md",
      "computedHash": "36f8d1838fef4895e25efbac756412766828656ddb38f08e197c1084c3e92357"
    },
    "ucp": {
      "source": "Shopify/shopify-ai-toolkit",
      "sourceType": "github",
      "skillPath": "skills/ucp/SKILL.md",
      "computedHash": "b9ce70b22e3d2b5f4e4efdedcc7a08e9fb2dfc285699069f3e331ff32b9fcab4"
    },
    "unslop": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/unslop/SKILL.md",
      "computedHash": "4069ec6c10a0228152079f52706221dc469a9e30a3040398eefd1e9c18fe6cf2"
    },
    "wait-what": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/wait-what/SKILL.md",
      "computedHash": "b4f3760a199cbd6415e4c885de230bef4eecba563791de211a92d335e16a9cb0"
    },
    "wayfinder": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/wayfinder/SKILL.md",
      "computedHash": "4af8ec5362024e82017056169efdcb1bc7671d11a1d6e2a8a8aab997675426e0"
    },
    "what-did-i-get-done": {
      "source": "michael-denyer/pstack-claude",
      "ref": "main",
      "sourceType": "github",
      "skillPath": "plugins/pstack/skills/what-did-i-get-done/SKILL.md",
      "computedHash": "c2b206c90991d42a771bb5250fabe2a0b4e9a5ffb5b59856512ebbcdb4e43be9"
    },
    "why": {
      "source": "cursor/plugins",
      "sourceType": "github",
      "skillPath": "harness/pstack/claude-code/skills/why/SKILL.md",
      "computedHash": "ca48b2106890c8f512b6a375f6a3a755f40ff4cbf61d58e7cce9ded0e79d9c51"
    },
    "wizard": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/engineering/wizard/SKILL.md",
      "computedHash": "c8fffad2f165f6c34e415ee291f9f8a9f1ef8cdea1b15b4f0034f615f49d8827"
    },
    "writing-beats": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/writing-beats/SKILL.md",
      "computedHash": "1d1c32479fa0774738c7baf264026e937f4a75ef7c20bd6c1b585681cadb523c"
    },
    "writing-for-agents": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/writing-for-agents/SKILL.md",
      "computedHash": "831e996c177c6c5233eb3bb472a33edee2b3ce1ee5a6d7e8b696c1c3fb4eda3d"
    },
    "writing-fragments": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/writing-fragments/SKILL.md",
      "computedHash": "e97c829457cb9119aa6a636b989b3c3e273e55c9bcf27b6d281d8132e04ca972"
    },
    "writing-shape": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/in-progress/writing-shape/SKILL.md",
      "computedHash": "175889218686932bda7724425b97a0a10a7679db51447c40a1a0d3a5e6f2130e"
    }
  }
}
```

## .cursor rules

## git ignore check
.gitignore:4:.env	.env
.gitignore:6:dist	dist
.gitignore:10:*.tsbuildinfo	tsconfig.tsbuildinfo
.gitignore:13:.claude/	.claude

## tracked by git (should be empty)
