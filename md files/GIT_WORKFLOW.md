# Git workflow — citizen flow agent

These rules are absolute. If anything elsewhere conflicts with this file, this file wins.

## Your branch
You work in exactly one branch: `feature/citizen-flow`.

- Never run `git checkout main`, `git checkout feature/admin-flow`, or switch to any
  other branch to make edits.
- If `feature/citizen-flow` doesn't exist yet, create it from `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/citizen-flow
  git push -u origin feature/citizen-flow
  ```
- Confirm your branch before every change: `git branch --show-current` must print
  `feature/citizen-flow`. If it doesn't, stop and fix it before editing anything.

## Start of every session
```bash
git status                        # working tree must be clean; if not, stop and report why
git checkout feature/citizen-flow
git fetch origin
git merge origin/main --no-edit               # pull in shared schema/contract updates
git merge origin/feature/citizen-flow --no-edit  # pick up any teammate/human commits
```
Never use `git pull --rebase` and never `git rebase` a branch that has already been
pushed. Rebase rewrites history — with two people working in parallel, that causes silent
divergence that's hard to detect later. Merge only, never rebase shared commits.

## While working
- Commit early and often. One commit = one logical change (one function, one component,
  one endpoint) — not "end of day, everything."
- Before every commit:
  ```bash
  git status
  git diff
  ```
  Read the diff. Confirm it only touches files in your scope (see `CLAUDE.md`). If it
  touches `apps/admin/`, `backend/app/routers/admin.py`, or anything you didn't intend to
  change, unstage it and investigate before continuing.
- Never commit: `.env`, `.env.local`, `__pycache__/`, `node_modules/`, `.venv/`, model
  weight files, `logs/`. If `.gitignore` doesn't already cover these, add the entries
  before your first commit — see `docs/ENVIRONMENT_SETUP.md`.

## Commit messages — Conventional Commits, always
```
<type>(<scope>): <short summary, imperative mood, no period>
```
Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
Scope: `auth`, `submission`, `nlp`, `cv`, `dedup`, `upload`, `tracker`.

Examples:
```
feat(auth): add citizen signup and login pages
feat(submission): wire POST /complaints to Supabase
feat(nlp): integrate zero-shot classification for category and severity
fix(upload): handle missing image field without 500 error
docs(decision-log): record choice of all-MiniLM-L6-v2 for embeddings
```
Never use vague messages like `update`, `fix stuff`, `wip`, `changes`.

## Pushing
```bash
git add <specific files — never `git add .` blindly>
git commit -m "<type>(<scope>): <summary>"
git push origin feature/citizen-flow
```
- Push after every 1–3 commits, not just at the end of the day — it's your backup and
  lets Person 2 and the human see progress.
- Never `git push --force` or `--force-with-lease`, on any branch, ever. If a push is
  rejected (non-fast-forward), someone else pushed to `feature/citizen-flow` first —
  merge, don't force:
  ```bash
  git fetch origin
  git merge origin/feature/citizen-flow --no-edit
  git push origin feature/citizen-flow
  ```
- Never push to `main`. Merging into `main` happens through a pull request that a human
  (or Person 2, reviewing) merges — you open the PR, you don't merge it.

## Merge conflicts
1. Stop. Don't guess at resolving business logic you don't have context for.
2. Open the conflicted files, read both sides.
3. Mechanical conflict (import order, formatting, non-overlapping additions in the same
   file) → resolve it, and note the resolution in `docs/DECISION_LOG.md`.
4. Substantive conflict (two different implementations of the same function, conflicting
   schema assumptions) → do NOT resolve it yourself. `git merge --abort`, log it in
   `docs/DECISION_LOG.md` under a "Needs human input" heading, and stop work on that file
   until it's resolved by a person.

## Things you must never do
- Never force-push, on any branch.
- Never rewrite published history (`rebase -i` on pushed commits, `commit --amend` after
  pushing, `reset --hard` past a pushed commit).
- Never delete a branch that isn't yours.
- Never edit `.git/config`, CI workflow files, or repository secrets.
- Never commit directly to `main`.
- Never `git add .` or `git add -A` without reading `git status` first.
