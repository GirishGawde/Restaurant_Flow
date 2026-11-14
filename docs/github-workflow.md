# GitHub Workflow

## Branches
- `main`: always working; nobody pushes directly (protect it: require a pull request and one approval)
- `dev`: where finished work is combined and tested
- `feature/<name>-<task>`, created from `dev`: for example `feature/ayush-add-order-item`, `feature/diya-ticket-trigger`, `feature/sakshi-record-payment`, `feature/girish-rls`

## Daily commands
```
git checkout dev
git pull
git checkout -b feature/ayush-add-order-item
# work, test
git add .
git commit -m "sql: add add_order_item with version check"
git push -u origin feature/ayush-add-order-item
# open a Pull Request into dev on GitHub
```

## Commit messages
Format `<area>: <what changed>`. Areas: `sql`, `api`, `ui`, `docs`, `fix`, `chore`.
Examples: `sql: create kitchen_ticket table`, `api: return 409 on version conflict`, `ui: build split bill screen`. Commit small and often.

## Pull requests
- Describe what it does, which files or tables it touches, and how to test it.
- At least one other member reviews it. Suggested pairs: Ayush and Diya, Sakshi and Girish. Anything touching someone else's table is also checked by that table's owner.
- For SQL: run the whole file set on a fresh test database first; it must run with no errors.
- Merge with Squash and merge into `dev`. When `dev` is tested together, Girish merges `dev` into `main`.

## SQL files and the shared database
- The SQL files in the repository are the truth. The shared database must be reproducible from them.
- Write and test in your own Supabase project; copy the final working version into the `.sql` file in VS Code; then push. Do not leave fixes only in the SQL Editor.
- Only after a pull request is merged does Girish run the new file on the shared project.
- Never edit a file already run on the shared database. Add a new numbered file.

## Merge conflicts
- Pull from `dev` often so branches stay small.
- Each member edits their own files, so conflicts should be rare. Shared files (Flask app setup, React routes, README) should change in small edits, with a heads-up to the group.
- The two people who wrote the conflicting lines resolve it together. Never force push to `dev` or `main`.

## Tracking work
- GitHub Issues: one per function, screen or demo script, assigned to its owner, labelled `sql`, `api`, `ui`, `demo` or `docs`.
- Project board columns: To do, In progress, In review, Done.
- Requests for changes to someone else's table are issues assigned to the owner.

## Before final submission
- Tag `v1.0` on `main`
- Confirm a fresh clone plus the README steps runs from scratch
- Export final SQL, demo scripts and documents into `docs/`
