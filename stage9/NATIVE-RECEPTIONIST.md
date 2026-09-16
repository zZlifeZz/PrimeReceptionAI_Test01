# Native Human Generator receptionist

The selected working direction is Human Generator body A, the native Medium Side Part bob, an opaque white women's shirt and a black tie. Previous A/B masters, hairstyles and the earlier Aurelia integration remain fallback checkpoints.

This branch prepares that character for the existing Prime Reception scene and speech transport. It does not activate either live entry page or include the purchased model, textures or recording in the repository.

## Separate master and browser derivative

The purchaser's `Prime_Reception_Selected_Master.blend` keeps the native Human Generator controls, strand hair and 8K source skin. `Prime_Reception_Selected_Office_Master.blend` adds the original reception environment. These files are independent of the browser export.

The private browser derivative has 51 native facial targets mapped to ARKit names, native bone names, a lower-teeth jaw target, and eyebrow/lash controls. Lash strips follow their eyelid root surfaces through blinking. The bob uses mesh fibers sampled from the native groom because the standard wide-card conversion did not preserve the selected appearance. The wet outer eye surfaces remain present.

The renderer recognizes Three.js's sanitized `eyeballL` and `eyeballR` names, retains the native resting smile, and uses the existing audio output clock, attention controls, origin/nonce checks, packet hashes and Stop behavior. The native controller rig remains in the HQ master; the browser skeleton has a baked neutral bind pose suitable for the existing head/eye/speech animation path. Full-body gesture retargeting is not part of this validation.

## Private review

Open the delivered `Review_Prime_Reception.html` in a normal desktop browser. It contains the character, office, poster and original five-second ElevenLabs recording. Press **Play saved speech**. No uploads, API keys or new synthesis requests are needed. The framing selector changes layout; it is not a physical mobile performance test.

The rendered poster uses the native master. If WebGL is unavailable, the review explicitly reports a still-image fallback. Do not interpret that fallback as a successfully rendered browser model.

## Assets and later activation

After distribution clearance and browser/device review, the asset destinations are:

| Private file | Destination |
|---|---|
| `Prime_Reception_Native_Web.glb` | `stage9/avatar/Prime_Reception_Native_Web.glb` |
| `Reception_Office_Environment.glb` | `stage9/avatar/Reception_Office_Environment.glb` |
| `Prime_Reception_Office_Preview.png` | `stage9/avatar/studio-poster.png` |

The prepared `studio-index.html` and `studio-home.html` entry pages use the existing single iframe architecture. The activation details in `STUDIO-INSTALL.md` apply with these native asset names. Existing live entry pages are unchanged by this branch.

## Reproducible checks

The diagnostics use Three.js 0.180.0, sharp 0.35.4 and esbuild 0.25.9. The optional optimizer also uses glTF Transform 4.5.0, meshoptimizer 1.2.0 and gltf-validator 2.0.0-dev.3.10.

```sh
node stage9/diagnostics/test-native-studio.mjs /private/Prime_Reception_Native_Web.glb /private/Original_ElevenLabs_Test.wav /private/native-check.json
node stage9/diagnostics/test-output-clock.mjs
node stage9/diagnostics/test-playback-timeline.mjs
node stage9/diagnostics/build-native-review.mjs /private/Prime_Reception_Native_Web.glb /private/Reception_Office_Environment.glb /private/Original_ElevenLabs_Test.wav /private/Prime_Reception_Office_Preview.png /private/Review_Prime_Reception.html
```

The loader test decodes real embedded images and measures actual skinned/morphed vertex movement for the face, teeth, lashes, eyes and hair. It also checks closed lips, neutral reset, the original recording hash, cue-driven mouth movement, tampering and stale-packet rejection. These are direct asset/control tests, not GPU rendering or live-provider tests. The accompanying Blender checks re-import and render the exported GLB to inspect appearance and poses; their render engine is not Three.js.

## Remaining release gates

The supplied asset licence and the seller's [licence FAQ](https://help.humgen3d.com/license) restrict sharing easily extractable model/texture assets, including modified assets. Public raw-GLB delivery needs written clarification from the seller for this intended use. Signed URLs alone would not remove extractability.

The connected cloud browser's security policy blocked the private review page. Consequently, this release still needs visual GPU review in a normal browser and physical mobile performance checks. The private review and HQ masters are available independently of those launch gates.
