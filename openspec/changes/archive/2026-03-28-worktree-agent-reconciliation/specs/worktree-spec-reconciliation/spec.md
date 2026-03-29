## ADDED Requirements

### Requirement: Sync specs with AI action on spec divergence screen
When spec divergence is detected, the divergence screen SHALL present a "Sync specs with AI" action that resumes the worktree session with a spec reconciliation prompt auto-sent on navigate.

The action SHALL:
- Be available whenever the merge step state is `'openspec-divergence'`
- Fetch the spec diff (`git diff {mergeBase}..main -- openspec/specs/`) before navigating; truncate to 8000 characters if needed
- Navigate to the existing worktree session via `/session/{sessionId}` with an `autoSendMessage` param
- The message SHALL include the spec diff inline and instruct the agent to: (1) review the spec changes, (2) update the implementation in the worktree branch to match the new requirements, (3) commit, (4) reply "Ready to merge" when done
- The existing "Pull + Resync" git action SHALL remain as a secondary option below the new AI action

#### Scenario: User taps Sync specs with AI on divergence screen
- **WHEN** the merge step is `'openspec-divergence'` and the user taps "Sync specs with AI"
- **THEN** the app fetches the spec diff, then navigates to `/session/{sessionId}` with `autoSendMessage` set to the spec reconciliation prompt containing the diff

#### Scenario: Spec diff is large
- **WHEN** the spec diff exceeds 8000 characters
- **THEN** the diff is truncated to 8000 characters with a `[truncated — run git diff for full output]` suffix appended to the prompt

#### Scenario: Agent completes reconciliation and user navigates back
- **WHEN** the user navigates back to the merge screen after the agent has committed updates
- **THEN** the merge screen re-runs prechecks; if main has no new spec commits since the updated branch point, the divergence warning is cleared and the screen advances to `'preview'`

#### Scenario: Session is inactive when Sync specs with AI is tapped
- **WHEN** the worktree session is not active and the user taps "Sync specs with AI"
- **THEN** the app navigates to the session with the message pre-filled in the input instead of auto-sent
