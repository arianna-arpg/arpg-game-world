# Class key art

These 36 original paintings were generated for Hollow Wake on 2026-11-09
using built-in image generation in the owner's chat. No stock images or
third-party artwork were supplied. The existing Berserker, Sorcerer and
Necromancer paintings remain in the parent folder, bringing coverage to
all 39 classes. These are illustrative key art, not gameplay screenshots.

The art direction uses each class's description and starting abilities,
cinematic dark fantasy materials, subdued weather and fog, a dark left
third for copy, and a distinct character, weapon, spell or companion.
Full prompts and original output filenames are preserved in
`docs/design/class-art-prompts.json`. The generation tool did not expose
an underlying model version; none is inferred here.

Original 1536 x 1024 PNGs are retained in the owner's generated-image
library. Website files are WebP conversions at quality 86 and compression
level 6, with no cropping, compositing or upscaling. The 36 web images total
about 7 MB. Only the selected image loads in the class showcase.

`site/assets/class-art.js` owns class-to-image mapping, descriptive alt text,
and optional crop positions. The existing memory-art renderer owns the
organic smoke rim; it is not baked into these images.
