### PR explanation

**You own the reader's model of the change.**

1. Read the PR's description, linked tickets, comments and reviews verbatim (`gh pr view <pr> --json title,body,closingIssuesReferences,comments,reviews`), its inline review threads (`gh api --paginate repos/<owner>/<repo>/pulls/<pr>/comments`), each ticket the body names, then the full diff against its base (`gh pr diff <pr>`).
2. For each changed function, name what calls it and what it calls. For each changed file that is not code, name what loads or runs it.
3. Explain per the Explaining code trigger, in this order: what changes for the code's users, how it works (the data flow through the changed code), and why, cited to the ticket, a thread, or the description when it is the only source.
4. List what a reviewer should check: behavior no test proves, risky paths, and claims in the description that the diff does not back.
5. Meet every item in **Verify**.

**Reply:** what the PR changes for its users, how and why, and the reviewer list with a `file:line` per item.
