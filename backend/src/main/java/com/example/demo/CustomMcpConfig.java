package com.example.demo;

import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.ServerParameters;
import io.modelcontextprotocol.client.transport.StdioClientTransport;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Configuration
public class CustomMcpConfig {

    @Bean
    public List<McpSyncClient> mcpSyncClients() {
        // MUST inherit System.getenv() so we don't strip HOME and PATH, which Coral requires!
        Map<String, String> env = new HashMap<>(System.getenv());
        if (System.getenv("GITHUB_PAT") != null) env.put("GITHUB_TOKEN", System.getenv("GITHUB_PAT"));
        if (System.getenv("LINEAR_API_KEY") != null) env.put("LINEAR_API_KEY", System.getenv("LINEAR_API_KEY"));
        if (System.getenv("SENTRY_AUTH_TOKEN") != null) env.put("SENTRY_AUTH_TOKEN", System.getenv("SENTRY_AUTH_TOKEN"));
        if (System.getenv("SONARQUBE_API_KEY") != null) env.put("SONARQUBE_API_KEY", System.getenv("SONARQUBE_API_KEY"));

        ServerParameters params = ServerParameters.builder("/usr/local/bin/coral")
                .args("mcp-stdio")
                .env(env)
                .build();

        StdioClientTransport transport = new StdioClientTransport(params);

        // THE SILVER BULLET: Use the sync builder to override the initialization timeout to 3 MINUTES!
        io.modelcontextprotocol.client.McpSyncClient syncClient = io.modelcontextprotocol.client.McpClient.sync(transport)
                .initializationTimeout(Duration.ofMinutes(3))
                .requestTimeout(Duration.ofMinutes(3))
                .build();

        // Explicitly initialize the client (this will now block for up to 3 minutes without failing)
        syncClient.initialize();

        return List.of(syncClient);
    }
}
