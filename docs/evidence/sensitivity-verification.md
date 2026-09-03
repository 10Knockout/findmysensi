# Sensitivity profile verification

Last reviewed: 2026-09-03

## Canonical model

FindMySensi's native sensitivity is the Aimlabs Default numeric scale.

- Native `1.0` means `0.05 degrees per raw mouse count` before any optional,
  separately modeled device/browser calibration.
- Cross-game conversion uses degrees per raw count and physical cm/360.
- eDPI remains a game-local display metric and is never the cross-game
  conversion authority.
- FOV is excluded from base hipfire counts-per-360 conversion.

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

- [Aimlabs official converter](https://aimlabs.com/mouse-sensitivity-converter)
  describes cm/360 as the universal physical comparison and lists Aimlabs,
  Valorant, CS2, Apex Legends, and PUBG as distinct game choices.
- [Aimlabs official profile guide](https://aimlabs.com/articles/aimlabs/how-to-configure-and-convert-your-sensitivity-in-aimlabs/)
  explains that switching Game Profiles preserves physical mouse distance and
  that CPI/DPI must be entered correctly.
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

Status: pending execution on the product owner's physical 2400-DPI setup. The
software must not claim device-level parity until that evidence is recorded.
