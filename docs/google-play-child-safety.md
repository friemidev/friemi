# Google Play child safety review

This is a release and operational checklist, not a guarantee of approval. Do not
certify a process that the operator has not actually put in place.

## Public standards and contact

- Standards URL, after deploying this change: `https://www.friemi.com/en/safety#child-safety`.
- Chinese and French: `/zh-CN/safety#child-safety` and `/fr/safety#child-safety`.
- Contact designated by the owner: Friemi team, `friemi.dev@gmail.com`.
- Standards must open without login, error, geographic restrictions or deployment protection.
- The page explicitly prohibits CSAE and CSAM, explains in-app reporting, removal,
  account restrictions and reporting confirmed CSAM to the appropriate authority.

## Reviewer paths

Use an ordinary signed-in test account, not an administrator:

1. Profile > Settings > Feedback & child safety > Child safety > enter a text-only
   concern > Send feedback. The success confirmation appears inside the app;
   neither an email client nor an external browser is required.
2. Another user's profile > More (...) > Report > Child safety or other safety concern.
3. Direct chat > More (...) > Report. This reports the other user's account;
   include the message time and context in the description. It does not attach
   an entire private conversation automatically.
4. Activity/group-plan details, moments and comments retain their existing Report actions.

Report submission requires signing in. Published standards do not. Supply valid
reviewer access through Play Console App access when the reviewer needs it.

## Verify receipt and handling

- General and child-safety feedback is stored in `OfficialFeedback`. Child-safety
  submissions carry `[CHILD SAFETY / CSAE / CSAM]` in the official inbox.
- The operator must sign in with the actual `friemi.dev@gmail.com` account and
  check the official feedback inbox in Chats. Setting that address as a profile's
  editable contact email does not grant access. This is not an outgoing email service.
- Targeted reports are stored in `Report`; active site admins receive the existing
  report notification and review them under `/en/admin/reports`.
- Use harmless test text to confirm both paths and receipt. Never upload, download,
  forward or reproduce suspected CSAM to test the system.
- Assign an operator to monitor both queues. Record triage, investigation and the
  actual moderation action. Changing a report status alone does not remove content
  or suspend an account. Restrict access/remove confirmed violating content and
  take account action using the existing moderation process.
- Establish and use a reporting process for confirmed CSAM to the relevant regional
  authority or NCMEC where legally applicable. Handle necessary records securely
  with restricted access and retention; get qualified legal guidance for obligations.
- Do not mark a child-safety report resolved until the required actions and external
  reporting, if applicable, are recorded. The contact must be reachable by Google.

## Release and Play Console

1. Test mobile form scrolling with the keyboard open, failed submission/retry,
   success, cancellation and fresh reopening. Verify all three languages.
2. Deploy the web changes through dev and the owner's production release flow.
   This change does not add a database migration or an Android native dependency.
3. In the Play-installed Android app, verify the same paths. Web-only changes do
   not normally require a new AAB when the installed shell loads this website;
   follow any specific resubmission requirement shown by Play Console.
4. In the Child safety standards declaration, enter the public URL and designated
   contact. Confirm the in-app feedback mechanism only after verifying it in-app.
   Confirm CSAM handling and legal compliance only after the operational checklist
   above is in place. Save and submit the declaration for review.
5. Provide the reviewer paths above and a short screen recording of a harmless
   feedback submission. Do not claim an update is live before production is deployed.

Official references:

- https://support.google.com/googleplay/android-developer/answer/14747720
- https://support.google.com/googleplay/android-developer/answer/9878809
