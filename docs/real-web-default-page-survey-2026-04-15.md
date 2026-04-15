# Real Web Default Page Survey

Date: `2026-04-15`

## Goal

Replace the current Firefox default landing page with a `real web` page that is less likely to trigger bot checks during repeated manual or agent-driven testing.

This survey explicitly excludes adding new internal fixture pages for the browser default. The target is a public, real-web page with lower friction than Google Search.

## Why This Survey Exists

In the current codebase, Firefox still defaults to `https://www.google.com` in multiple places:

- [packages/core/src/apps/browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts:235)
- [packages/core/src/apps/browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts:676)
- [packages/core/src/env/factory.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/factory.ts:248)
- [packages/core/src/tasks/starter/browser-web-tasks.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/starter/browser-web-tasks.ts:36)
- [packages/mcp-server/src/qa/viewer-desync.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/qa/viewer-desync.ts:144)

In our current environment, repeated use of Google Search has already surfaced robot verification pages. That makes it a poor default homepage for deterministic browser testing.

## Evaluation Criteria

Candidates were judged on:

- `public access`: no login required for the first meaningful screen
- `anti-bot risk`: low visible CAPTCHA, challenge, or rate-limit risk in ordinary browsing
- `stability`: content and layout should not churn too quickly across repeated runs
- `readability`: page should still feel like a real website, not a blank shell
- `manual-test suitability`: works as a safe landing page before any task-specific navigation

## Exclusion Policy

The following categories should not be used as the default Firefox landing page:

- `search engines / search-result pages`
  Examples: [Google Search](https://www.google.com/), [Bing](https://www.bing.com/)
- `social or login-centered sites`
  Examples: [X](https://x.com/), [LinkedIn](https://www.linkedin.com/home)
- `recommendation-heavy media or news homepages`
  Examples: [YouTube](https://www.youtube.com/), [Google News](https://news.google.com/)

Why these are bad fits:

- they are more likely to trigger bot checks or rate limits
- they are often personalized by account, location, or browsing history
- they can show login walls or degraded anonymous experiences
- their DOM and visible content churn too quickly for stable testing

Background references:

- [Google Search Help: unusual traffic](https://support.google.com/websearch/answer/86640?hl=en)
- [Microsoft Support: search history personalization](https://support.microsoft.com/en-us/topic/search-history-on-the-privacy-dashboard-904dbfd6-adeb-4555-3e63-3ce34b6de60a)
- [Microsoft Rewards Support: limited searches](https://support.microsoft.com/en-au/topic/limiting-your-searches-in-microsoft-rewards-439be015-897e-4a5f-ae01-b3aff4ea2404)
- [X Help: advanced search requires login](https://help.x.com/en/using-x/x-advanced-search)
- [YouTube Help: homepage recommendations depend on watch history](https://support.google.com/youtube/answer/9962575)

## Candidate Survey

### Tier A: Best default-homepage candidates

#### 1. [IANA Reserved Domains](https://www.iana.org/domains/reserved)

Assessment:

- best balance of `real web`, `low friction`, and `repeatability`
- loaded as a public reference page with no visible CAPTCHA or login wall in current checks
- structure is simple, stable, and light enough for repeated smoke/manual testing

Tradeoffs:

- a little dry
- less “rich web” feeling than larger documentation sites

Why it stands out:

- multiple independent checks favored it as the safest replacement for Google
- unlike richer documentation sites, it did not show obvious bot-management signals in the reviewed results

Sources:

- [IANA Reserved Domains](https://www.iana.org/domains/reserved)
- [IANA Example Domains](https://www.iana.org/help/example-domains)

#### 2. [IANA Example Domains](https://www.iana.org/help/example-domains)

Assessment:

- excellent fallback or ultra-safe smoke-test landing page
- short, static, and predictable
- no visible CAPTCHA or login wall in current checks

Tradeoffs:

- probably too short for richer read/extract browser tasks
- better as a fallback than as the long-term single default homepage

Sources:

- [IANA Example Domains](https://www.iana.org/help/example-domains)
- [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606.html)

### Tier B: Good richer real-web candidates

#### 3. [W3C Introduction to Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

Assessment:

- strong real-web documentation feel
- richer than IANA while still public and readable
- likely suitable for manual browsing and simple extraction tasks

Tradeoffs:

- more site chrome and navigation than IANA
- less deterministic as a default landing page than the IANA pages

Source:

- [W3C Accessibility Intro](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

#### 4. [MDN HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)

Assessment:

- good real-world documentation page
- no visible CAPTCHA or login wall in the reviewed checks
- useful if we want a more familiar developer-doc homepage

Tradeoffs:

- heavier page weight
- sidebar, localization, theme, and layout chrome add churn
- better for explicit doc tasks than as the one safe default homepage

Source:

- [MDN HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)

### Tier C: Good documents, but slightly riskier or less suitable as the default

#### 5. [RFC Editor RFC 9110 Info Page](https://www.rfc-editor.org/info/rfc9110)

Assessment:

- very stable and official
- highly repeatable
- useful if we want a more standards-heavy default

Tradeoffs:

- one review observed Cloudflare bot-management cookies on RFC Editor pages
- still a better fit as an alternate “stable docs” page than as the first default choice

Source:

- [RFC Editor RFC 9110 Info](https://www.rfc-editor.org/info/rfc9110)

#### 6. [W3C CSS Cascade Level 5](https://www.w3.org/TR/css-cascade-5/)

Assessment:

- solid richer standards page
- readable enough for real-web browsing tasks

Tradeoffs:

- one review observed Cloudflare bot-management cookies on W3C pages
- published standards pages are stable, but still heavier and more niche than IANA

Source:

- [W3C CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/)

#### 7. [WHATWG HTML Standard (Developer Edition)](https://html.spec.whatwg.org/dev/)

Assessment:

- strong real-web docs feel
- no visible CAPTCHA or login wall in the reviewed checks

Tradeoffs:

- very large
- a living standard, so content churn is expected
- better as a deliberate task target than a default homepage

Source:

- [WHATWG HTML Standard (Developer Edition)](https://html.spec.whatwg.org/dev/)

## Recommended Default

### Primary recommendation

Use [IANA Reserved Domains](https://www.iana.org/domains/reserved) as the default Firefox landing page.

Why:

- it is the safest real-web replacement for Google in this environment
- it minimizes CAPTCHA and personalization risk
- it is simple enough for repeated testing, but still clearly a public web page

### Recommended fallback

Use [IANA Example Domains](https://www.iana.org/help/example-domains) as a fallback if we want an even shorter and more predictable page.

### Recommended richer alternates

If we want a more “real documentation web” feel for some tasks without returning to search engines:

- [W3C Accessibility Intro](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [MDN HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)

## Codebase Impact

If we switch from Google to a safer real-web default, these are the first places to update:

- browser default state in [packages/core/src/apps/browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts:676)
- Google-specific first-tab click behavior in [packages/core/src/apps/browser-lite.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/apps/browser-lite.ts:235)
- browser window initialization in [packages/core/src/env/factory.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/env/factory.ts:248)
- browser starter task setup that still begins on Google in [packages/core/src/tasks/starter/browser-web-tasks.ts](/Users/baghyeonbin/Desktop/CoWork/packages/core/src/tasks/starter/browser-web-tasks.ts:36)
- QA assumptions that still assert Google-visible body text in [packages/mcp-server/src/qa/viewer-desync.ts](/Users/baghyeonbin/Desktop/CoWork/packages/mcp-server/src/qa/viewer-desync.ts:144)

## Final Recommendation

For this repository, the cleanest policy is:

- default Firefox landing page: `IANA Reserved Domains`
- default fallback page: `IANA Example Domains`
- avoid search engines, social/login-heavy sites, and recommendation-heavy homepages
- reserve richer documentation pages like MDN, W3C, RFC Editor, and WHATWG for explicit tasks rather than the universal browser default

## Source Set

Primary candidate pages:

- [IANA Reserved Domains](https://www.iana.org/domains/reserved)
- [IANA Example Domains](https://www.iana.org/help/example-domains)
- [Example Domain](https://example.com/)
- [W3C Accessibility Intro](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [MDN HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)
- [RFC Editor RFC 9110 Info](https://www.rfc-editor.org/info/rfc9110)
- [RFC Editor RFC 9110 Full Text](https://www.rfc-editor.org/rfc/rfc9110)
- [W3C CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/)
- [WHATWG HTML Standard (Developer Edition)](https://html.spec.whatwg.org/dev/)

Policy references:

- [Google Search Help: unusual traffic](https://support.google.com/websearch/answer/86640?hl=en)
- [Microsoft Support: search history](https://support.microsoft.com/en-us/topic/search-history-on-the-privacy-dashboard-904dbfd6-adeb-4555-3e63-3ce34b6de60a)
- [Microsoft Rewards Support: search limits](https://support.microsoft.com/en-au/topic/limiting-your-searches-in-microsoft-rewards-439be015-897e-4a5f-ae01-b3aff4ea2404)
- [X Help: advanced search](https://help.x.com/en/using-x/x-advanced-search)
- [YouTube Help: homepage recommendations](https://support.google.com/youtube/answer/9962575)
