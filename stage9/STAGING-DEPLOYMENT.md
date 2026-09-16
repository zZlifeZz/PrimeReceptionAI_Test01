# Native receptionist staging integration — 2026-09-16

The owner requested replacing the receptionist on https://primetesti.carrd.co
before approving any rollout to https://primereceptionai.ca.

This branch contains source only. It does not include the Human Generator web
asset, office GLB or preview, and does not activate either live entry page.
Automatic approval review blocked the public asset upload pending explicit
approval for those licensed files in `zZlifeZz/PrimeReceptionAI_Test01`.
The fully assembled local staging release and all previous masters are saved.

## Existing deployment boundary

| Component | Current setup |
|---|---|
| Test Carrd embed | GitHub Pages `stage9/avatar/index.html`, parentOrigin `https://primetesti.carrd.co` |
| Main Carrd embed | Same repository's root `index.html` |
| Speech backend | Render service `prime-backend-stage4` (`srv-daflsnv40ujc73bsefg0`) |
| Backend revision | `3f5c00b7cf000afb364fbef25dd32a243246817d` |
| Previous frontend revision | `59eb888` |

The root production entry, Carrd layout and single iframe, existing chat and
speech bridge remain unchanged. No OpenAI model/key, ElevenLabs voice/key,
Render service, plan, CORS or DNS change is needed for the staging visual swap.

## Prepared assets

The installation helper requires the three private delivery files and checks
their hashes before copying them into the runtime locations. It refuses to
overwrite the current entry without writing a local fallback copy first.
It does not publish anything or alter the root entry.

```sh
node stage9/diagnostics/install-staging.mjs \
  /private/Prime_Reception_Tie_Web.glb \
  /private/Reception_Office_Environment.glb \
  /private/Prime_Reception_Tie_Office_Preview.png
```

The tie controller is loaded by `studio-scene.mjs`; the GLB alone cannot execute
its JavaScript behavior. Source packs and high-quality Blender masters remain
separate saved checkpoints. The derivative retains the selected face, eyes,
hair, shirt, facial targets and accessory rig.

## Validation

The web asset has passed GLTFLoader, skinning, facial controls, blinking, gaze,
hair attachment, preserved-material, speech timing and tie clearance checks.
The release entry also passes syntax checks and the existing audio-output
clock/playback timeline tests.

The current cloud browser cannot create WebGL on the old test renderer. The
new renderer has a speech-capable poster fallback. That fallback must not be
represented as proof of rendered 3D, lip sync or secondary tie motion.
Published asset hashes, GPU visuals, live speech with the replacement and
physical mobile performance still need staging verification after activation.

## Rollback and later production

Restore only `stage9/avatar/index.html` from `59eb888` in a new commit to return
to the previous test renderer. Its asset and runtime remain available.
Do not reset branch history or delete saved masters.

Production cutover is deliberately deferred. It will also need explicit
production speech/origin configuration: the present test endpoint accepts
only `https://primetesti.carrd.co`. Simply changing Carrd's domain will not
complete that rollout.
