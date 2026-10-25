### Live verification

**You own the verdict. It names the identity it ran against; green CI and bot reviews are inputs.**

1. Name the environment, read the deployed identity (version, SHA, image digest or revision), and confirm it matches the change.
2. Pick the surface: the verify or drive tooling the project context names, else a read-only API call. Ask when neither reaches the change.
3. Run the scenario on a baseline (the previous revision, or an environment without the change) when one exists.
4. Run it on the target and keep the output. A scenario that writes in prod goes through **Hand-off**.
5. Give the verdict PASS, PASS+NOTES or FAIL, naming the identity.
6. Meet items 1, 2, 3 and 5 of **Verify**.

**Reply:** the verdict, the identity it ran against, and the outputs.
