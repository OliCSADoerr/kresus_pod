#!/bin/bash
set -e

FIX=""
QUIET="--quiet"
TARGET=""

while [[ $# -gt 0 ]]
do
key="$1"
case $key in
    -v|--verbose)
    QUIET=""
    ;;
    -f|--fix)
    FIX="--fix"
    ;;
    *)
    TARGET="$TARGET $key"
    ;;
esac
shift # past argument or value
done

if [ "$TARGET" == "" ]
then
    TARGET="./server ./client ./tests ./bin"
fi

concurrently \
    "yarn run ci:package-json" \
    "yarn run -- eslint --cache $QUIET --ext .js,.ts $FIX $TARGET"\
    "yarn run ci:lint-css $QUIET $FIX"
