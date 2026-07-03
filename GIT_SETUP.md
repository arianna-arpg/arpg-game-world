# Git + GitHub setup for ARPG Game - World

A one-time setup so this folder is version-controlled and backed up on GitHub,
and so Claude Code can commit / push changes for changelogs and reverts.

## How the pieces fit together

- **Git** is *local* version control. It lives in a hidden `.git` folder inside
  this project. A **commit** is a snapshot of your tracked files + a message.
  The chain of commits IS your changelog, and it's what lets you revert.
- **GitHub** is a *cloud copy* of that repo — called the **remote** (named
  `origin`). Pushing uploads your commits. It's your backup and web view.
- **Claude Code** has no special GitHub powers. It just runs the same local
  `git` commands you would, using the credentials you cache once below. So
  "letting Claude Code commit" = having a working local repo + saved login.

Nothing is committed until YOU (or Claude Code) run `git commit`. The
`.gitignore` I added already excludes `node_modules/`, `dist/`, `saves/`,
`.env`, and `.claude/settings.local.json`.

---

## Step 1 — Install Git for Windows  (required)

Download and run: https://git-scm.com/download/win
Accept the defaults (they include **Git Credential Manager**, which handles
GitHub login for you). Then open a **new** terminal (PowerShell or Git Bash)
and confirm:

    git --version

## Step 2 — Tell git who you are  (authors your commits)

    git config --global user.name  "Your Name"
    git config --global user.email "you@example.com"

Use the email on your GitHub account (or GitHub's privacy no-reply address).

## Step 3 — Initialize the repo in this folder

    cd "D:\Games\Claude\ARPG Game - World"
    git init -b main

This creates the `.git` folder and sets the default branch to `main`.

## Step 4 — Make the first commit (your baseline snapshot)

    git add -A
    git status          # sanity check: node_modules/ dist/ saves/ should NOT appear
    git commit -m "Initial commit: ARPG game world"

(You may see "LF will be replaced by CRLF" warnings — normal and harmless.)

## Step 5 — Create the empty repo on GitHub

1. Go to https://github.com/new
2. Name it (e.g. `arpg-game-world`), choose **Private**.
3. **Do NOT** tick "Add a README", ".gitignore", or "license" — we already
   have our own; adding them creates a conflicting first commit.
4. Click **Create repository**. Copy the URL it shows, e.g.
   `https://github.com/<your-username>/arpg-game-world.git`

## Step 6 — Link local -> GitHub and push

    git remote add origin https://github.com/<your-username>/arpg-game-world.git
    git push -u origin main

On the first push, a browser window opens to sign in to GitHub (Git Credential
Manager). Approve it once — the login is cached in Windows Credential Manager,
so every future push (including Claude Code's) is automatic.

> Prefer a token? Instead of the browser flow you can create a **fine-grained
> Personal Access Token** at GitHub -> Settings -> Developer settings, grant it
> Contents: Read/Write on this repo, and paste it when git asks for a password.
> The browser flow is easier and is the default.

---

## Everyday workflow

**Commit a change (you or Claude Code):**

    git add -A
    git commit -m "Describe what changed and why"
    git push

Just tell Claude Code "commit and push these changes" — it runs the above.

**Changelog / history:**

    git log --oneline --graph        # every commit, newest first
    git show <hash>                  # what a specific commit changed

**Reverting:**

    git restore <file>               # discard uncommitted edits to one file
    git revert <hash>                # undo one past commit via a NEW commit (safe)
    git reset --hard <hash>          # roll the whole project back to <hash>
                                     #   (drops later commits — use with care)
    git show <hash>:src/engine/world.ts   # view an old version without changing anything

**Optional — make Claude Code commit consistently:** add a note to a
`CLAUDE.md` in this folder, e.g. *"After a meaningful change and a clean
`npx tsc --noEmit`, stage and commit with a clear message; push when asked."*

You can delete this GIT_SETUP.md once you're set up.
