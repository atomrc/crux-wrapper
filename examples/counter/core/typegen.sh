cargo run --package core --bin crux_cli --features cli

# Remove js and d.ts files that could cause build problems
find ./types -name "*.d.ts" -delete -o -name "*.js" -type f -delete
