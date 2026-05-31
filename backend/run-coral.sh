#!/bin/sh
# Add the required sources using the environment variables passed by Spring Boot
coral source add github
coral source add linear
coral source add sentry
coral source add sonarqube
# Execute the MCP server
exec coral mcp-stdio
