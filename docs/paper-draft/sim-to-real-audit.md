# Sim-to-Real Audit

Date: 2026-03-19

## Goal

Judge whether the current environment reads as a real Ubuntu/GNOME desktop or as a replica, using OSWorld-style interaction evidence rather than source-first reasoning.

## Verdict

Current verdict: replica.

Multiple independent auditors converged on the same conclusion:

- the shell silhouette is plausible
- the app surfaces are less uniform than before, but Firefox still reads as a benchmark-owned surface rather than a naturally evolved web app
- a strong agent would distinguish this environment from real Ubuntu with high confidence

## Evidence

Primary evidence images:

- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-selected.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-selected.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-help-tab.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-help-tab.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/mail-message-selected.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/mail-message-selected.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/terminal-command-ran.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/terminal-command-ran.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario13-after-new-folder.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/local-input-qa/scenario13-after-new-folder.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/osworld-adversarial-qa/runs/2026-03-19T07-43-56-466Z/browser-recovery-final.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/osworld-adversarial-qa/runs/2026-03-19T07-43-56-466Z/browser-recovery-final.png)

## Concrete Replica Cues Reported By Auditors

The latest auditors were consistent about the exact cues they used:

1. Firefox still looks benchmark-shaped.
- `Bookmarks / Categories / Results / Task details` reads like a purpose-built evaluation board, not like a naturally evolved live web application.

2. Firefox layout is still too rigid.
- even after the hybrid surface pass, the browser content still looks too tightly packed and too column-fixed
- task cards and detail panels still compress in ways that look more mock-like than responsive

3. App-family uniformity is still visible.
- Files, Thunderbird, and Terminal have improved, but they still read as surfaces from one custom renderer family rather than as three independently evolved desktop applications

4. Firefox was improved the most.
- auditors explicitly noted that the new hybrid browser surface reduced the old “shared JSX panel” giveaway
- the remaining problem is now information architecture and density, not obviously fake browser chrome

## Ranked Gaps

1. Firefox content is still the largest giveaway, even after the hybrid surface pass.
The browser content is now rendered through a host-managed Chromium surface, which materially improves realism, but the page composition still reads like a curated benchmark board rather than a naturally evolving live web application.

2. Thunderbird is too cramped and too card-like.
The folder pane, message list, and preview pane collapse into narrow synthetic bands instead of reading like a real mail client.

3. Terminal semantics are too toy-like.
If the terminal advertises its command whitelist or only exposes a tiny command set, agents can immediately infer they are in a training mock.

4. Files is still too shallow semantically.
It now has a better filesystem contract than before, but it still behaves more like a simplified file picker than Nautilus.

5. Window chrome is too uniform across apps.
When every app shares the same titlebar language, spacing, and visual rhythm, the desktop reads as one custom renderer instead of a real OS hosting distinct applications.

## Root Cause

The main problem is not only visual styling. The larger issue is architectural:

- the shell is Ubuntu-like
- the apps are still mostly environment-owned mock surfaces
- too much of the UI is rendered through one shared component language

That produces a desktop that is controllable and deterministic, but still obviously simulated.

## Current Direction

The most effective path is:

1. Keep deterministic state and shared filesystem semantics.
2. Keep task-owned browser pages semantically core-authoritative while using hybrid runtime only where real external browsing matters.
3. Reduce cross-app visual uniformity.
4. Make each app feel more like its real counterpart in both layout and behavior.
5. Re-run blind replica-vs-real audits after each major UI/semantic pass.

## Immediate Priorities

1. Firefox
- make the OSWorld Explorer page feel like a real web page, not an environment dashboard
- reduce clipped detail blocks
- increase realistic browser/content separation

2. Thunderbird
- widen the default window
- improve pane proportions and message density
- reduce text clipping and card-like rendering

3. Terminal
- remove training-environment banner language
- move closer to a normal shell-first empty session

4. Window chrome
- reduce macOS-like traffic-light cues
- remove duplicated per-window app labels
- allow more app-specific chrome and spacing

## Immediate Mitigations Applied

This audit led to multiple mitigation passes:

- window chrome was made less macOS-like and less uniform across apps
- duplicated right-aligned app labels were removed from titlebars
- Terminal now opens as a normal shell surface instead of showing a training banner
- Thunderbird default window width and pane proportions were increased
- Firefox content can now be rendered through a host-managed hybrid Chromium surface instead of only through synthetic JSX panels
- browser task windows were widened so the Firefox content area is less compressed

Updated evidence after those changes:

- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-reset.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/browser-workflow-reset.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/mail-reset.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/mail-reset.png)
- [/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/terminal-reset.png](/Users/baghyeonbin/Desktop/CoWork/output/playwright/representative-qa/terminal-reset.png)

These changes materially reduce the Firefox-specific giveaway, but they do not eliminate the main gap yet:

- Firefox content is still benchmark-shaped
- Thunderbird still compresses unnaturally at the preview/title layer
- Files still reads as a simplified mock file manager
- browser content semantics and observation alignment still need deeper host ownership to fully remove render-vs-meaning drift

## Success Criterion

This audit should be repeated until a blind auditor can no longer confidently distinguish the environment from a real Ubuntu screenshot or short interaction clip using one or two obvious cues.
