#!/usr/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <output_directory>"
    exit 1
fi

bun build src/index.tsx --outdir build/
cp web_template.html ritual_web.html
sed -i 's/{BUNDLE}/ritual_web\/index.js/' ritual_web.html

# there should only be one css file in the build directory
css_filename=$(basename "$(find build/ -name '*.css' -type f)")
sed -i "s|{STYLESHEET}|ritual_web/$css_filename|g" ritual_web.html

mv ritual_web.html "$1"
cp build/* "$1/ritual_web"
