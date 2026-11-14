---
name: git-workflow
description: Start repository-changing tasks on a fresh branch from the latest origin/main, name branches with a conventional type and kebab-case slug, and leave all changes uncommitted for the user to review. Use when starting a task that will modify tracked files in a Git repository, such as a feature, fix, refactor, test, docs, or chore. Do not use for read-only questions, reviews, investigations, or when the user only asks to run a specific Git command.
---

# Git Workflow

Work from the repository root. Preserve unrelated changes and keep one branch scoped to one task.

## Rules

1. Never edit tracked files on `main` or on a stale branch. Before the first edit, create a task branch from the freshly fetched `origin/main`.
2. Never commit, stage, push, tag, open a pull request, amend, or rewrite history unless the user explicitly asks. Hand off the changes uncommitted for review.
3. Never discard, stash, reset, clean, rebase, or force-push the user's work. When a step would lose or move uncommitted changes, stop and ask.

## Scope

This skill applies to any task that changes tracked files: feature, fix, refactor, test, docs, chore, build, or CI work.

It does not apply to read-only tasks such as questions, code review, or investigation, and it does not replace a specific command the user asked to run.

If the current branch already belongs to the same task and the working tree holds that task's changes, treat the task as a continuation: keep the branch, do not create another one.

## Project binding

This skill is reusable across projects. Set this section for the current repository; the rest of the document uses the binding terms.

| Item | This repository |
| --- | --- |
| Remote | `origin` |
| Base branch | `main` |
| Base ref | `origin/main` |
| Branch format | `<type>/<short-slug>` |
| Branch types | `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci` |
| Verification | The change workflow in `AGENTS.md`, including `bun run verify` |

For another repository, copy this skill and replace the binding table. Keep the workflow sections unchanged.

## Start a task

Run from the repository root; resolve it with `git rev-parse --show-toplevel` when unsure.

1. Inspect the current state:

   ```bash
   git status --short --branch
   ```

   - If the tree holds uncommitted changes that do not belong to this task, stop and ask how to proceed. Never move, stash, or commit them on your own.
   - If the changes belong to this task, keep the current branch, run the fetch below, and report when `origin/main` has moved. Do not merge or rebase without permission.

2. Fetch the base:

   ```bash
   git fetch origin --prune
   ```

   If the fetch fails, stop and report it. Do not branch from a stale `origin/main`, and do not fall back to a local `main` that was not just fetched.

3. Decide whether a branch is still needed:

   ```bash
   git branch --show-current
   git merge-base --is-ancestor origin/main HEAD
   ```

   Continue on the current branch only when it is the task branch and it already contains `origin/main`. Otherwise create a branch.

4. Choose the branch name with the section below, then validate it:

   ```bash
   git check-ref-format --branch "<type>/<slug>"
   ```

5. Create and switch the branch directly from the fetched base, without touching local `main`:

   ```bash
   git switch --create <type>/<slug> origin/main
   ```

6. Verify the starting point before editing:

   ```bash
   git branch --show-current
   git log -1 --format='%h %s' origin/main
   git merge-base --is-ancestor origin/main HEAD
   ```

   The branch must point at the fetched `origin/main` commit.

7. Tell the user the branch name and base commit in one short line, then proceed with the task.

## Name the branch

Use `<type>/<short-slug>`, with the type describing the primary intent of the change.

| Type | Use for |
| --- | --- |
| `feat` | New user-visible behavior or API |
| `fix` | Bug fix |
| `refactor` | Behavior-preserving code change |
| `perf` | Performance improvement |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Maintenance, dependencies, config, tooling |
| `build` | Build system or packaging |
| `ci` | Continuous integration configuration |

Naming rules:

- Use lowercase ASCII with hyphens between words, two to five words, and keep the whole name within about 50 characters.
- Describe the outcome, not the activity: `feat/avatar-upload`, not `feat/update-code`.
- Do not use spaces, underscores, uppercase letters, a trailing slash, or a trailing dot. Git also rejects `..`, `~`, `^`, `:`, `?`, `*`, `[`, and `\`.
- Add an issue or ticket identifier only when the project or the user provides one, for example `feat/123-avatar-upload`.
- Never reuse an old task branch for a new, unrelated task.
- If the primary type is genuinely ambiguous, ask one short question instead of guessing.

Examples:

| Task | Branch |
| --- | --- |
| Add avatar upload | `feat/avatar-upload` |
| Fix duplicate invoice numbers | `fix/duplicate-invoice-numbers` |
| Rename taxonomy helpers | `refactor/taxonomy-helper-names` |
| Add missing API tests | `test/notes-api-coverage` |

## Work on the branch

- Change only what the task requires and leave unrelated files alone.
- Do not stage or commit. Leave the edits in the working tree so a plain `git diff` shows the full review surface.
- Do not create tags, push, open pull requests, or delete branches.
- If `origin/main` moves after the branch was created, report it. Do not merge or rebase without the user's go-ahead.
- Never sweep unrelated user changes into anything you stage or commit.

## Finish for review

1. Run the verification that the task requires, following the change workflow in `AGENTS.md`.
2. Report the branch and change surface:

   ```bash
   git branch --show-current
   git status --short
   git diff --stat
   ```

3. Point the user at the review artifacts: `git diff` for tracked edits, plus the list of new untracked files. Because nothing was staged, `git diff` is the entire change.
4. Suggest one conventional commit message, such as `feat: add avatar upload`, without committing it.
5. State explicitly that nothing has been committed or pushed, and ask the user to review.

## If the user asks to commit

Only then:

- Stage only the task's files with `git add <paths>`, after checking `git status` so unrelated changes are not included.
- Write a conventional message: `<type>: <imperative summary>`, about 72 characters or fewer, no trailing period.
- Do not amend, rebase, or force-push.
- Do not push unless the user also asks.
- Report the commit hash and the remaining working-tree state.

## Safety checks

- Never run `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .`, `git branch -D`, or `git push --force` unless the user explicitly asks for that exact destructive action.
- Never stash user changes just to unblock a branch switch; ask instead.
- Stop and report rather than improvising when the fetch fails, `origin/main` is missing, the repository has no `origin` remote, `HEAD` is detached, or a merge or rebase is in progress.
