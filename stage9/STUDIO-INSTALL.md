# Aurelia studio replacement

The current website renderer binds mesh names, materials and bone axes from the old character. This change supplies a separate renderer for the fitted Human Generator receptionist while keeping the existing speech transport and one `primeAvatar` iframe.

## Included behavior

- Original fitted materials, aligned office, frontal camera and responsive framing.
- Calibrated mouth poses, face/brow/lash mixing and lower-teeth movement. Multi-material mesh children inherit their parent's facial role.
- Independent blink, small head/eye movement and the existing attention policy. Reduced-motion preferences suppress tracking and expressive head motion.
- Existing speech player, final audio output clock, packet/hash guard, nonce/origin checks and cancellation remain in place.
- If WebGL or model loading fails, display the poster and allow the existing speech player to initialize. Context loss stops audio before switching to the poster.
- One scene, character instance and renderer. No additional iframe.

## Private asset delivery

The purchaser's `Prime_Receptionist_Web_Package.zip` contains these files for `stage9/avatar/`:

| Package file | Destination |
|---|---|
| `Prime_Receptionist_Web.glb` | `stage9/avatar/Prime_Receptionist_Web.glb` |
| `Reception_Office_Environment.glb` | `stage9/avatar/Reception_Office_Environment.glb` |
| `Studio_Preview.png` | `stage9/avatar/studio-poster.png` |

The packed 8K Blender master is delivered separately. The web model uses 4K skin colour/normal and 2K roughness maps; it is not an 8K browser export.

## Activation

This prepared source package deliberately does not contain the purchased model or textures. Do not activate the following entry pages until the model's intended public WebGL distribution has been cleared and assets are present:

1. Install the three files above.
2. Copy `stage9/avatar/studio-index.html` over `stage9/avatar/index.html` for the existing voice test site. Preserve the Carrd iframe URL's `parentOrigin` parameter, iframe ID and audio permission.
3. Copy `stage9/avatar/studio-home.html` over the root `index.html` for the main site's current model-only iframe. This root entry receives the approved parent pointer relay and does not create a new voice owner.
4. Verify on desktop Chrome and physical iPhone/Android: appearance, clothing during gaze and speech, loading, Enable Voice, interruption/Stop, mute and section focus. Confirm exactly one `primeAvatar` iframe.

The main site's current Carrd page does not include the stage9 chat interface. This model replacement does not silently add a second chat system or move test-only backend endpoints into production.

## Private preview

Open the delivered `Review_Aurelia.html` in a normal local browser. Select the two GLBs and `Original_ElevenLabs_Test.wav` together. Press **Play original speech**. All selected bytes remain local; there are no synthesis requests or provider keys. The original WAV is hash-matched to the existing timestamp packet. Frame choices simulate layout and are not mobile-device performance tests.

When WebGL is unavailable, the portrait stays still while the real model can be parsed for numeric control checks. This is stated in the preview UI; it must not be represented as a successful GPU rendering test.

## Verification

`diagnostics/test-studio.mjs` loads the actual compressed GLB through Three.js `GLTFLoader`, decodes embedded image dimensions, checks morph roles including lower-teeth mesh children, exercises the saved ElevenLabs cue sequence, checks closure/blink/Stop, and verifies stale/tampered packet rejection. It does not create a GPU context or play audio.

For local test dependencies install `three@0.180.0 sharp@0.35.4 esbuild@0.25.9`. Run:

```sh
node stage9/diagnostics/test-studio.mjs stage9/avatar/Prime_Receptionist_Web.glb Original_ElevenLabs_Test.wav studio-check.json
node stage9/diagnostics/test-output-clock.mjs
node stage9/diagnostics/test-playback-timeline.mjs
node stage9/diagnostics/build-studio-review.mjs Review_Aurelia.html
```

## Remaining release constraints

The provided Human Generator licence and the seller's [licence FAQ](https://help.humgen3d.com/license) restrict distributing easily extractable models/textures, including edited assets. The purchaser's direct public GLB delivery requires clarification for the intended use. No public asset upload, main-site activation, or live-provider claim is part of this draft.

The cloud browser connected, but its GPU could not create WebGL on the existing website, and its security policy blocked opening the local review page. No workaround was attempted. Real-browser 3D visuals, physical mobile performance and live ElevenLabs playback remain unverified. The source Blender render and original-audio identity/control tests are separate evidence.
