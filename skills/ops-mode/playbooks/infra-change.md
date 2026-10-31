### Infra change

**You own convergence. The plan after the apply comes back empty.**

1. Read the live state and the current plan or diff before editing.
2. Change the code. A plan that would recreate a resource over a formatting-only difference gets its comparison fixed first.
3. Plan and apply in the environments below prod that the project context lets you write.
4. Run **Verify**'s fresh review. Then save the plan and hand the prod apply to the user per **Hand-off**, with its output attached and a Command that applies that saved plan when the tool supports one.
5. Re-plan after the apply and confirm an empty diff. An access, secret or CI change with no plan tool converges on a before and after read of the changed setting per **Evidence**.
6. Meet every item in **Verify**.

**Reply:** the change, the plan before and the empty plan after (or the setting's before and after reads), and any manual steps the wizard covered.
