#!/bin/sh
# Add the required sources using the environment variables passed by Spring Boot
# We MUST redirect stdin (< /dev/null) so these commands don't consume the JSON-RPC payload from Spring AI!
# We MUST redirect stdout (> /dev/null) so they don't break the JSON-RPC protocol with text output!
coral source add github < /dev/null > /dev/null 2>&1
coral source add linear < /dev/null > /dev/null 2>&1
coral source add sentry < /dev/null > /dev/null 2>&1
coral source add sonarqube < /dev/null > /dev/null 2>&1
# Execute the MCP server
exec coral mcp-stdio
