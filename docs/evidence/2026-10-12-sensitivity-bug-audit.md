# Sensitivity discrepancy fix and local regression audit

Date: 12 October 2026. Scope: public frontend/trainer/protocol plus private API settings validation. This report records the pre-release local audit; GitHub, CI, and production deployment evidence are verified separately during release. No production-data repair or user email was performed.

## Reported discrepancy and correction

The reported 1600-DPI recommendation is browser sensitivity `0.67925`, canonical Aimlabs Default `0.485179`, and estimated `23.56 cm/360` under the existing 1.4 browser calibration. Quick Setup saves `0.679251` when converting the rounded canonical value; the difference of one millionth from the original tested value is display-rounding precision, not another multiplier.

Settings and in-game Settings formerly fed the saved browser value directly to the canonical Aimlabs cm/360 formula. That yielded `16.82738`, displayed as `16.8`. They also told players to copy the browser value directly into Aimlabs Default. Both statements were inconsistent with Quick Setup and the recommendation screen.

The corrected screens label the editable value “FindMySensi Browser Sensitivity”, show the separate Aimlabs Default equivalent, and show `23.56 cm/360` as an estimate. Both use the same rendered `SensitivityEquivalents` component. The existing calibration inverse is applied before native metrics are computed.

Runtime gain remains the tested saved browser value multiplied by `0.05 degrees/input unit`. It does not acquire another 1.4 multiplier. Recorded run cm/360 metadata now also removes the browser calibration first; previously that metadata shared the same erroneous direct calculation. Existing historical records have not been rewritten.

## Other reproduced bugs fixed

| Finding                            | Previous behavior                                                                                         | Local correction                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unknown DPI in in-game Settings    | Opening Settings filled 800 and saving could persist that assumption                                      | Preserve null DPI; show an empty DPI field and no invented distance                                                         |
| Unknown DPI in Find My Sensi       | Recommendation metrics silently assumed 800                                                               | Require an explicit DPI before starting; use the entered DPI for equivalents                                                |
| Quick Setup DPI                    | Started at 800 regardless of an existing saved DPI                                                        | Initialize from saved DPI, or leave unknown DPI empty                                                                       |
| Unsupported saved sensitivity      | Frontend schema and API accepted `0`, `0.0`, `101`, and arbitrarily large decimals; runtime rejected them | Validate positive sensitivity up to the existing runtime maximum of 100, with a bounded decimal string, in frontend and API |
| Incomplete custom resolution       | Frontend schema and API accepted custom resolution without both dimensions; runtime rejected it           | Require both dimensions when custom resolution is selected                                                                  |
| Registration username HTML pattern | Browser rejected the unescaped literal hyphen in the pattern and skipped that constraint                  | Escape the hyphen; Chromium checks permitted hyphens and rejected slashes                                                   |

The registration fix follows [MDN's HTML pattern rules](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern): patterns use the `v` flag and literal hyphens in character classes must be escaped.

## Why the earlier tests missed the sensitivity bug

1. Conversion tests established canonical math; browser-calibration tests established apply/remove math. Neither exercised the Settings consumer after saving.
2. Runtime configuration tests correctly proved degrees/input unit for a saved value. That does not prove a UI converts that value back to the correct native scale.
3. The old Settings browser smoke test asserted only the default input value and section presence. It never asserted turn distance or Aimlabs equivalent.
4. Calibration UI tests inspected source strings rather than rendered values. Their passing status did not certify the entire save/display workflow.
5. API settings tests covered color normalization and weapon hand. They did not verify that accepted settings could initialize the trainer.

Before the fix, all 697 public unit/property tests and 142 private tests passed. A new test rendering the actual in-game Settings modal failed on the reported state. Newly added public and API validation tests also failed for all reproduced unsupported settings before their fixes.

The broader browser run exposed the registration pattern issue despite passing unit tests. It also exposed harness problems: the login test had not stubbed its session request; the Settings selector needed its new label; headless Chromium did not release Pointer Lock after a synthetic Escape. The harness now uses the actual `document.exitPointerLock()` API and subsequent real pointerlockchange handler, and every smoke API request receives a harness-controlled response. This is browser integration evidence with simulated API responses, not live backend or physical-device proof.

## New regression evidence

- Actual modal rendering asserts saved `0.67925`, canonical `0.485179`, and `23.56`, and rejects the old `16.8` presentation.
- Runtime gain assertion preserves `0.0339625 degrees/input unit` for the saved recommendation.
- Conversion round trip checks incoming canonical value, saved value, outgoing canonical equivalent, estimated cm/360, null DPI, and identity calibration.
- Chromium enters Aimlabs `0.485179`, saves the converted `0.679251`, navigates to Settings, starts a real trainer, releases Pointer Lock, opens in-game Settings, and saves without changing the sensitivity.
- Chromium checks the unknown-DPI calibration guard and unknown-DPI Settings display.
- Frontend and API regression tests reject impossible sensitivity and incomplete custom dimensions while retaining supported values and null defaults.

## Verification

Public: 707 tests across 106 files. Private API: 148 tests across 18 files. Chromium: 14 tests. Typechecking, lint, formatting, production web build, private package builds, architecture boundaries, protocol-freeze validation, decision validation, and disposable in-memory migration validation were run. Final results are reported in the accompanying chat handoff.

The broader automated suite exercises gameplay/input/scoring kernels, run storage, protocol, auth, API, and UI smoke paths. This was a targeted review plus full available regression gates; it is not a claim that every possible defect has been found. Remote CI and production behavior are release evidence outside this local audit report.

## Local manual acceptance

Run the public web app from `F:\Dev\findmysensi\findmysensi` with `rtk npm run dev`. Development proxies API requests to `http://localhost:4000` unless API_URL is set. Authenticated Settings/training need the usual local API service.

1. In Quick Setup, select Aimlabs Default, enter `0.485179`, and use DPI 1600. Expect browser sensitivity `0.679251` and estimated `23.56 cm/360`.
2. Save and open Settings. Expect the saved browser value, canonical `0.485179`, and estimated `23.56`. Repeat in paused in-game Settings.
3. Existing recommendation `0.67925` should remain unchanged unless you explicitly edit it.
4. With unknown DPI, Settings should show “Set your mouse DPI”. Find My Sensi should require DPI before starting.
5. For physical verification, set actual hardware DPI to 1600 and compare repeated ruler-measured 360-degree sweeps in FindMySensi and Aimlabs Default. Compare slow and fast sweeps and record browser/OS and raw input availability.

The 1.4 browser calibration remains the existing assumed default. No global scale change or saved-value migration was made. Automated checks cannot establish `23.56 cm/360` on a particular physical mouse and browser.
