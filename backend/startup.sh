#!/bin/sh
# This script runs BEFORE Java starts, so it doesn't eat into the 20s Spring AI timeout!

echo "Warming up Coral and registering schemas..."

# Map Render environment variables to what Coral expects
# Source .env if it exists so we have the variables locally
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

export GITHUB_TOKEN=$GITHUB_PAT
export LINEAR_API_KEY=$LINEAR_API_KEY
export SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
export SONARQUBE_API_KEY=$SONARQUBE_API_KEY

# Register sources (these take a long time on 0.1 CPU, so we do it BEFORE Java!)
coral source add github || true
coral source add linear || true

# Pre-warm the SQL engine
coral sql "select 1" > /dev/null 2>&1 || true

echo "Coral warmup complete. Starting Spring Boot..."

# Start the Java application with restricted memory
exec java -Xmx300m -jar target/demo-0.0.1-SNAPSHOT.jar
