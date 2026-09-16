# Prime Reception tie refinement

The approved Human Generator character is preserved. Only the necktie is
replaced. The high-quality office master and the web derivative are separate
files; earlier versions remain saved.

The accessory contains one fixed `PrimeTie_Anchor` and five moving bones,
`PrimeTie_01` through `PrimeTie_05`. The accessory rig attaches to the existing
upper spine. The original 102 character bones, face morphs, skin, eyes, hair,
shirt, office and framing are retained.

`avatar/tie-secondary-motion.mjs` implements a damped spring/constraint solver.
It consumes actual torso motion, evaluates a small skinned shirt collision
patch, limits displacement, and checks the skinned tie after applying the bone
rotations. It writes only the five accessory bones. There is no cloth engine
and no independent decorative oscillation.

`studio-scene.mjs` constructs the solver after loading the model and calls it
after character animation and before rendering. It resets on visibility
resume and disposes with the scene. Reduced-motion mode retains garment fit
without inertia. Call external body animation before this accessory pass; the
optional `beforeAnimation` callback supports that ordering.

The GLB carries the bones, weights and collision helper; a GLB alone cannot
contain JavaScript behavior. It must be used with this controller and the
updated scene module. The helper is invisible both through the controller and
its transparent material in other viewers.

After approval, install the delivered `Prime_Reception_Tie_Web.glb` at the
existing asset path `stage9/avatar/Prime_Reception_Native_Web.glb`. No backend
or speech-provider setting changes are required.

The private review adds knot/front/three-quarter/office cameras and an
eight-second movement test. `tie-review-motion.mjs` supplies torso motion ONLY
for that review; it is not part of the production idle animation. The review
uses the existing saved ElevenLabs recording. It makes no synthesis calls.

Validation includes the actual compressed GLB loaded by Three.js, skinned
vertex clearance against the full shirt on every test frame, fixed-knot and
host-bone preservation, pause/reduced-motion handling, and the existing
facial, eye, blink, teeth and speech-timing checks. Existing image bytes,
material settings, vertex attributes and facial target names are compared
against the previously delivered model. Browser GPU appearance and physical
mobile performance still need review; the command-line checks do not establish
those.

The supplied commercial licence is recognized. Its commercial-software grant
includes a condition concerning extraction and reuse of assets. Public GLB
delivery remains an implementation/licensing question for the seller, not a
claim that the purchaser lacks a commercial licence. No site deployment,
public model upload or public source push is performed in this refinement.
