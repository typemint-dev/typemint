# Git commit message convention

When creating commits, the commit message MUST follow this format:

```
<type>(<scope>): <feature-slug> - <message>

<summary>
```

Fields:

- `type` is the nature of the change. Use one of: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`, `style`, `revert`.
- `scope` is the affected bounded context, package, or subsystem.
- `feature-slug` is a stable, human-readable identifier shared by all commits implementing the same feature.
- `message` is a short imperative description of the change.
- `summary` is a very short body, separated from the subject line by a blank
  line. It is REQUIRED on every commit.

The summary is one or two sentences saying what changed and why — the context a
reader needs that will not fit in the subject line. Keep it very short: prefer a
single sentence, and never let it grow past two. It says why the change was
needed or what it affects, not a restatement of the subject in longer words, and
not a file-by-file list of the diff.

Examples:

```
feat(auth): login-flow - add password reset endpoint

Users locked out of their accounts had no self-service way back in and
had to go through support.
```

```
fix(api): user-import - handle duplicate email addresses

A second row with an existing address aborted the whole import; it is
now skipped and reported.
```

```
refactor(core): event-store - simplify event serialization

Collapses the two encoder paths into one. No behaviour change.
```

```
docs(adr): permissions-model - document access model

Records the decision so the reasoning survives the people who made it.
```

```
test(timesheets): overtime-rules - add DST edge-case tests

The spring-forward hour was uncovered and had already produced one
miscalculated timesheet.
```

Also Just suggest the message and do not commit unless told to do so.
