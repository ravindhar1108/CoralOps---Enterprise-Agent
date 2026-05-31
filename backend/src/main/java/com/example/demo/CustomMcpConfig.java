package com.example.demo;

import io.modelcontextprotocol.client.McpAsyncClient;
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
        Map<String, String> env = new HashMap<>();
        if (System.getenv("GITHUB_PAT") != null) env.put("GITHUB_TOKEN", System.getenv("GITHUB_PAT"));
        if (System.getenv("LINEAR_API_KEY") != null) env.put("LINEAR_API_KEY", System.getenv("LINEAR_API_KEY"));
        if (System.getenv("SENTRY_AUTH_TOKEN") != null) env.put("SENTRY_AUTH_TOKEN", System.getenv("SENTRY_AUTH_TOKEN"));
        if (System.getenv("SONARQUBE_API_KEY") != null) env.put("SONARQUBE_API_KEY", System.getenv("SONARQUBE_API_KEY"));

        ServerParameters params = ServerParameters.builder("/usr/local/bin/coral")
                .args("mcp-stdio")
                .env(env)
                .build();

        StdioClientTransport transport = new StdioClientTransport(params);

        McpAsyncClient asyncClient = McpAsyncClient.builder(transport).build();

        // THE SILVER BULLET: Block for 3 MINUTES instead of the hardcoded 20 seconds!
        // This guarantees it will NEVER timeout on Render's slow free tier.
        asyncClient.initialize().block(Duration.ofMinutes(3));

        return List.of(new McpSyncClient(asyncClient));
    }
}
