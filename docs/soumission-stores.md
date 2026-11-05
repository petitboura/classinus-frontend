# Google Play and App Store submission: tracking

[English version] · [Français](soumission-stores.fr.md)

Last updated: 3 September 2026.

This file tracks each item in the release checklist so that future work can resume from the exact point reached. Nothing here is assumed: every **DONE** item comes from a direct code audit, and every **BLOCKED** item explains what is missing and who must provide it.

## Blockers and high-priority items

- [x] **AccessibilityService excluded from the `play` build.** Only the `externe` flavor contains the real service; `play` uses a stub that refuses all operations.
- [x] **Account deletion inside the app.** Implemented through `EspaceParametres.tsx` → `DELETE /api/profiles/me`, handled by `api/profiles.py:supprimer_mon_compte`. Still needs production testing.
- [x] **Account deletion outside the app.** The `classinus-frontend` website can be accessed without installing the app. After signing in, `/parametres` exposes the same deletion action.
- [x] **Privacy Policy infrastructure.** The `/confidentialite` route exists and `api/legal/confidentialite` was added to the backend whitelist. Bourama must paste the policy content into the Supabase `contenu_legal` table. The backend reads it; editing is done in the dashboard. Review the draft below before publishing, especially the fields that cannot be inferred.
- [ ] **Google Play Data Safety.** Draft answers are included below and must be entered in the Play Console form. This is not a code change.

## Permissions and compliance

- [x] `PACKAGE_USAGE_STATS` and `ACCESS_NOTIFICATION_POLICY` are documented in the code with their actual use: screen-time tracking, session control, and Do Not Disturb.
- [x] The audit found only four declared permissions: `INTERNET`, `POST_NOTIFICATIONS`, `ACCESS_NOTIFICATION_POLICY`, and `PACKAGE_USAGE_STATS`. All four are documented.

## Firebase and notifications

- [x] **iOS bug fixed.** `NotificationsNatives.demanderAutorisation()` requested local notification permission but never called `UIApplication.registerForRemoteNotifications()`. As a result, `didRegisterForRemoteNotificationsWithDeviceToken` was never called and the APNs token was not sent to the backend. The iOS push channel was therefore broken on the client, independently of Firebase/APNs server configuration. This has been fixed, and automatic re-registration on every launch was added because the token can change.
- [ ] **Remaining work outside the codebase.** Confirmed by reading `core/notifications_push.py`, which already contains Bourama's TODO:
  - Android (FCM): create a Firebase project, enable Cloud Messaging, generate a service-account key, and place `google-services.json` in `android/app/`. Configure `FCM_SERVICE_ACCOUNT_JSON_B64` and `FCM_PROJECT_ID` on the backend (Railway).
  - iOS (APNs): an Apple Developer Program account is required to generate an APNs key (`.p8`). Configure `APNS_KEY_P8_B64`, `APNS_KEY_ID`, and `APNS_TEAM_ID` on the backend.
  - **Neither platform requires the Firebase iOS SDK.** The architecture uses native APNs for iOS (signed JWT and direct HTTP/2 API) and FCM HTTP v1 for Android. Adding the Firebase iOS SDK would duplicate the existing pipeline.
  - These five credentials/files cannot be generated from the repository. Access to Firebase Console and Apple Developer is required.
- [ ] Test FCM/APNs on real devices while the app is open, in the background, and fully closed. This requires the credentials above and physical devices.

## OAuth

- [ ] Test OAuth flows in production and verify the actual redirect URIs. No audit was performed during this session. Test this manually.

## iOS and App Store

- [x] `PrivacyInfo.xcprivacy` was created at `ios/App/App/PrivacyInfo.xcprivacy` and added to the Xcode project (file reference and Resources build phase). It was based on an audit of the Swift code: `UserDefaults` is used in `DossiersDesignesRepository.swift`, no other Required Reason API was found, and the repository contains no tracking or advertising SDK. **The declared data types (email and user content) are a first draft and must be validated before submission.** The complete Supabase schema was not available, so legal completeness cannot be guaranteed.
- [x] **Sign in with Apple:** no implementation was found in the repository (no `ASAuthorizationAppleIDProvider` reference or corresponding button). If Classinus offers another third-party sign-in provider, such as Google, Apple requires Sign in with Apple as an equivalent option. Confirm the current sign-in methods: email/password only, or third-party OAuth as well?
- [x] Account deletion on iOS uses the same web/Android route (`DELETE /api/profiles/me`, called from shared component `EspaceParametres.tsx`).
- [ ] App Store metadata (screenshots, description, etc.) has not been started. This work is outside the code repository.

## Audience decision for this submission, made on 3 September 2026

At the time of this decision, Classinus was described as a product for schools (students and teachers), based in Tunisia/North Africa, with direct account creation on first launch. Middle-school students aged 11–13 were part of the long-term target audience, but **not for this first submission**. Bourama explicitly decided not to add age restrictions to the registration code: registration remains open as implemented. For this release, the audience was to be declared as high-school students aged 15 and older in the Play Console and App Store Connect forms.

Middle school may be added in a future release, with the appropriate compliance changes (age at registration and/or school invitation). Remove this note from the file when that work begins.

Practical implications for the submission forms:

- Google Play content rating: target audience is 13+; do not select **Designed for children** or **Mixed Audience**.
- Google Play Data Safety, **App is designed for children**: No.
- App Store Connect age rating / Made for Kids: do not select the Kids category. Keep store copy consistent and do not mention middle school until that audience is formally supported again.

---

## Privacy Policy draft

To be pasted into `contenu_legal` under the `confidentialite` key.

This draft is based only on features found in the code: accounts, document library, behaviors/skills, Google Drive/Notion/GitHub/Higgsfield OAuth connectors, notifications, session and screen-time controls, and memory. **Bracketed fields `[...]` cannot be inferred and must be completed before publication.**

```markdown
# Classinus Privacy Policy

Last updated: [date]

## Who we are

Classinus is operated by [legal entity name / sole proprietor],
[registered address or country]. For questions about this policy or
your data, contact us at [contact email].

## Data we collect

- **Account:** email address, password (encrypted), and profile
  information you provide.
- **Content you create:** documents added to your library,
  conversations with the assistant, custom behaviors/skills, and
  information saved in your memory.
- **Optional external connectors:** if you connect a Google Drive,
  Notion, GitHub, Higgsfield, or Claude account, we access data from
  that service within the permissions you grant during connection,
  solely to perform the actions you request.
- **Notifications:** a technical identifier (push token) is stored
  when you enable notifications so that we can send reminders you
  schedule.
- **Optional mobile features:** if enabled, the app may access
  (i) your phone's Do Not Disturb status so it can turn the mode on or
  off during a session you start, and (ii) application usage statistics
  for the screen-time tracking feature. Neither feature is enabled
  without an explicit action from you. You can disable them at any time
  in your phone settings.

## How we use this data

Only to operate Classinus: authentication, assistant responses,
library, behaviors, reminders, and connectors you enable. We do not
sell your data or use it for advertising.

## Processors and hosting

- **Supabase:** database and file hosting.
- **[primary language-model provider]:** processes your messages to
  generate assistant responses.
- **Google (Firebase Cloud Messaging)** and **Apple (APNs):**
  delivery of push notifications, depending on your device.
- **[other processors, e.g. behavior router, Railway/Vercel hosting]:**
  to be completed.

## Retention and deletion

You can delete your account at any time from Classinus (Settings) or
from the website, even without the app installed. Account and library
data will be deleted [specify: immediately / within X days].

## Your rights

[Adapt this section to the jurisdictions served, including GDPR where
applicable.] You may request access, correction, or deletion of your
data by contacting us at [contact email].

## Minors

The current version of Classinus is intended for high-school students
aged 15 and older, university students, and teachers. We do not
knowingly target children under 13 with the current app version. If you
believe a child under 13 has created an account, contact us at
[contact email] so we can delete it.
```

---

## Draft permission justifications for Google Play

**`PACKAGE_USAGE_STATS`:** Used only for the optional user screen-time tracking feature (shown in the app under [name of the relevant screen, e.g. "Focus" / "Screen time"]). The user must explicitly open Settings > Special app access > Usage access and enable the permission. There is no silent collection and no usage data is sent to advertising third parties.

**`ACCESS_NOTIFICATION_POLICY`:** Used only during a focus session voluntarily started by the user, to enable or disable Do Not Disturb for the duration of that session. The app redirects the user to system settings; it does not use a standard permission popup.

## Google Play Data Safety draft

- Data collection: Yes.
- Data types: email (account identifier), user files/documents, assistant conversation content, device identifier (push token).
- Shared with third parties: No, technical processors only (hosting, notification delivery, AI processing); no sale or advertising sharing.
- Encrypted in transit: Yes (HTTPS).
- Account deletion available: Yes, both in the app and outside the app.
- App designed for children: No (declared audience is 13+ for this release; see the 3 September 2026 decision above).
```
