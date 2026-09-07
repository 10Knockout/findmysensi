# Single sensitivity verification

Last reviewed: 2026-09-07

## Canonical model

FindMySensi's native sensitivity is the Aimlabs Default numeric scale.

- Native `1.0` means `0.05 degrees per raw mouse count` before any optional,
  separately modeled device/browser calibration.
- Cross-game conversion uses degrees per raw count and physical cm/360.
- eDPI remains a game-local display metric and is never the cross-game
  conversion authority.
- FOV is excluded from base hipfire counts-per-360 conversion.
- Game profiles are converter inputs only. Runtime settings store one native
  FindMySensi value and never keep an active game profile.

Runtime rotation uses the aim engine's `2^24` angle units per full turn. The
setup path converts the native sensitivity to a Q20 gain using exact rational
arithmetic. The input hot loop uses safe integer `Number` arithmetic with
independent yaw and pitch residuals; it does not allocate or use `BigInt` per
event.

## Shipping profile status

| Profile                | Adapter             | Version | Verification   | Conversion        |
| ---------------------- | ------------------- | ------: | -------------- | ----------------- |
| Aimlabs Default        | linear, yaw `0.05`  |       1 | cross-verified | available         |
| Valorant               | linear, yaw `0.07`  |       1 | cross-verified | available         |
| Counter-Strike 2       | linear, yaw `0.022` |       1 | cross-verified | available         |
| Apex Legends           | linear, yaw `0.022` |       1 | cross-verified | available         |
| PUBG: BATTLEGROUNDS    | nonlinear/unknown   |       1 | experimental   | research required |
| Other registry entries | not yet re-verified |       1 | experimental   | research required |

Experimental entries remain in the internal registry so their identity and
verification state are explicit. They are not exposed by the converter or
settings conversion controls, and their adapter methods fail closed.

## Reference provenance

The implementation is independently derived; no third-party source code or UI
was copied.

- [Aimlabs official converter](https://preview.aimlabs.com/mouse-sensitivity-converter)
  describes cm/360 as the universal physical comparison and lists Aimlabs,
  Valorant, CS2, Apex Legends, and PUBG as distinct game choices. Its current
  live result for Aimlabs `0.175` at 2400 DPI is Valorant `0.125` and
  `43.543 cm/360`, matching the frozen implementation vector.
- [Aimlabs official profile guide](https://aimlabs.com/articles/aimlabs/how-to-configure-and-convert-your-sensitivity-in-aimlabs/)
  explains that switching Game Profiles preserves physical mouse distance and
  that CPI/DPI and FOV must be entered correctly.
- [Aimlabs' official Game Profile guide](https://aimlabs.com/articles/aimlabs/did-you-know-aimlabs-has-a-sensitivity-converter-built-in/)
  confirms that the active Aimlabs profile changes how its displayed
  sensitivity number is interpreted. Compare FindMySensi `0.175` with Aimlabs
  Default `0.175`; Aimlabs' Valorant profile expects the Valorant number.
- [W3C Pointer Lock 2.0](https://www.w3.org/TR/pointerlock-2/) defines locked
  `mousemove` deltas as unbounded by the browser or screen edge and defines
  `unadjustedMovement: true` as bypassing platform mouse acceleration. The
  trainer therefore uses locked `mousemove` as its gameplay source, requests
  unadjusted input first, and falls back to ordinary Pointer Lock when raw input
  is unavailable. The UI warns when the fallback is active.
- [GamingSmart converter](https://gamingsmart.com/mouse-sensitivity-converter/)
  documents the same 360-distance method and same-DPI behavior. The product
  owner supplied a current screenshot with the exact golden observation:
  Valorant `0.125` at 800 DPI -> Aimlabs `0.175` at 800 DPI, `130.63 cm/360`,
  `51.43 in/360`, and Aimlabs eDPI `140`.
- [Aiming.Pro PUBG calculator](https://aiming.pro/mouse-sensitivity-calculator/player-unknown-battlegrounds)
  says it preserves cm/360 but its public page does not publish enough
  forward/reverse slider vectors to establish the current nonlinear curve.
- The supplied Mouse-Sensitivity.com PUBG reference was not accessible from
  the automated research environment on 2026-09-03.

Aimlabs' public documentation establishes profile behavior but does not publish
the underlying yaw constants. The constants above are therefore marked
`cross-verified`, not `official`.

## Frozen regression vectors

The unit suite freezes low, medium, and high values for:

- Valorant <-> Aimlabs Default
- Valorant <-> Counter-Strike 2
- Valorant <-> Apex Legends
- Counter-Strike 2 <-> Aimlabs Default

It also covers 400, 800, 1600, 2400, and 3200 equal-DPI invariance; 800 <->
1600 and 800 <-> 2400 changes; all directed round trips among the four verified
profiles; physical cm/in values; per-game eDPI; and native FMS/Aimlabs identity.

The mandatory personal vector is exact at the conversion boundary:

```text
Valorant 0.125 @ 2400 DPI
-> Aimlabs Default 0.175 @ 2400 DPI
-> FindMySensi native 0.175

cm/360 ~= 43.54
Valorant eDPI = 300
Aimlabs Default / FMS eDPI = 420
```

The Aimlabs profile name is part of that vector. These pairs are mechanically
equivalent at the same DPI:

```text
Aimlabs VALORANT 0.125 = Aimlabs Default 0.175 = FMS 0.175
Aimlabs VALORANT 0.175 = Aimlabs Default 0.245 = FMS 0.245
```

On 2026-09-07, a reported physical match near FMS `0.275` was traced to an
Aimlabs comparison performed while its saved game profile was `VALORANT`.
Aimlabs' displayed `0.175` in that profile is `0.245` on the Default/FMS scale
(`0.175 × 0.07 / 0.05`). The remaining difference between `0.245` and the rough
hand estimate is not evidence for a browser-wide multiplier.

## Browser input calibration layer

`packages/sensitivity/src/browser-calibration.ts` adds one explicit factor
between the canonical cross-game result and the number a player types into
FindMySensi. Rationale: the web platform does not guarantee that one Pointer
Lock `movementX` unit equals one hardware mouse count (MDN documents the unit
as browser- and OS-dependent), so the "type this in" value can differ from the
canonical cm/360-matching value by a constant per-platform scale.

- Default scale: `1.4` (`DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE`), from the
  product owner's repeated physical match of Valorant `0.125` / Aimlabs
  `0.175` against FindMySensi `0.245` on Chrome + Windows (`0.245 / 0.175`).
- Applied by the converter UI (`/tools/converter`) and Quick Setup only. A
  visitor entering Valorant `0.125` is shown FindMySensi `0.245`, and the
  page also shows the canonical `0.175` cm/360 value beside it.
- The canonical layer is unchanged. `convertSensitivity`,
  `gameSensitivityToFms`, `sensitivityToCmPer360`, the yaw constants, and
  `converters.spec.ts` still return and assert `Valorant 0.125 -> 0.175`.
- Not independently verified. `0.245` is also exactly the value of Aimlabs'
  `VALORANT` profile at `0.175` on the Default/FMS scale, so the wrong-profile
  explanation in "Frozen regression vectors" above remains equally consistent
  with the evidence. Set the scale to `1`
  (`IDENTITY_BROWSER_INPUT_CALIBRATION`) to make canonical == typed value.
- `browser-calibration.spec.ts` freezes the `1.4` default, the Valorant /
  Aimlabs / CS2 / Apex mappings through it, the apply/remove round trip, and
  the `0.25 - 4` trusted-scale bound.

## PUBG hold

No official current formula or sufficiently complete agreeing set of observable
vectors was found. Public technical material describes PUBG's 0-100 slider as
nonlinear, and some material explicitly labels its cross-game values as
approximate. FindMySensi therefore does not apply a single yaw coefficient or
claim exact PUBG support.

PUBG can move to `cross-verified` only after multiple current sources agree on
forward and reverse values at 0, 10, 25, 50, 75, and 100 (where valid), with a
documented tolerance.

## Manual device verification gate

Automated tests cannot prove that a particular browser/OS exposes hardware
counts identically to Aimlabs. In a development build, open the Gridshot route
with `?inputDebug=1` to see input units, accepted event count, expected angular
turn, actual engine angular turn, event source, raw-option acceptance, pointer
lock state, browser, and platform.

Before native device-level 1:1 parity is claimed, perform and record this test:

1. Use 2400 DPI and document Windows Enhance Pointer Precision state.
2. Configure Valorant `0.125`, Aimlabs Default `0.175`, and FMS `0.175`.
3. Compare repeated physical 180-degree or 360-degree sweeps in Aimlabs and FMS.
4. Repeat slowly and quickly while raw/unadjusted Pointer Lock is accepted.
5. Diagnose coefficient, browser units, OS acceleration, pointer-lock mode,
   event loss, DPI, fixed-point error, or projection before changing the
   canonical `0.05` coefficient.

Status: raw input is requested with an ordinary Pointer Lock fallback. The
2026-09-07 physical comparison used Aimlabs' `VALORANT` profile and therefore
did not test the canonical Default/FMS identity. The product owner declined
further physical testing, so device-level parity remains unclaimed. Runtime
accounting now exposes DOM, ring-buffered, display-consumed, and
simulation-consumed movement independently so any future mismatch can be
localized before coefficients are changed.
