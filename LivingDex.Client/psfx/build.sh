#!/bin/sh
# Bundles Pokémon Showdown's move animations into LivingDex.WebApi/wwwroot/lib/psanims.js
# and copies the small engine that plays them (psfx.js). Needs Node.js.
set -e
cd "$(dirname "$0")"
OUT=../../LivingDex.WebApi/wwwroot/lib
npx --yes esbuild@0.24.0 entry.ts --bundle --minify --format=iife --legal-comments=none \
  --banner:js='/*! Pokémon Showdown move animations: https://github.com/smogon/pokemon-showdown-client (engine MIT, move animations CC0). Bundled for Living Dex. */' \
  --outfile=$OUT/psanims.js
cp engine.js $OUT/psfx.js
