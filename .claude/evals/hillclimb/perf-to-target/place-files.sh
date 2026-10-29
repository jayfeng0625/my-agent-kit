#!/usr/bin/env bash
# Builds the invoicer fixture repo (shared with the mode eval) into ./invoicer.
set -eu
node "$(dirname "$0")/../../modes/fixture/build.ts" invoicer
