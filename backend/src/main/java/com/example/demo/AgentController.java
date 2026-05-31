package com.example.demo;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@org.springframework.context.annotation.Configuration
class GitHubModelsConfig {
    @org.springframework.context.annotation.Bean
    public org.springframework.boot.web.client.RestClientCustomizer githubModelsCustomizer() {
        return builder -> builder.requestInterceptor(new org.springframework.http.client.ClientHttpRequestInterceptor() {
            @Override
            public org.springframework.http.client.ClientHttpResponse intercept(org.springframework.http.HttpRequest request, byte[] body, org.springframework.http.client.ClientHttpRequestExecution execution) throws java.io.IOException {
                java.net.URI uri = request.getURI();
                if (uri.toString().contains("models.inference.ai.azure.com/v1/chat/completions")) {
                    java.net.URI newUri = java.net.URI.create(uri.toString().replace("/v1/chat/completions", "/chat/completions"));
                    org.springframework.http.HttpRequest newRequest = new org.springframework.http.client.support.HttpRequestWrapper(request) {
                        @Override
                        public java.net.URI getURI() { return newUri; }
                    };
                    return execution.execute(newRequest, body);
                }
                return execution.execute(request, body);
            }
        });
    }
}

@CrossOrigin("*")
@RestController
public class AgentController {

    private final ChatClient chatClient;
    private final java.util.List<org.springframework.ai.tool.ToolCallback> allTools;

    // ── Java-level Intent Detection ──────────────────────────────────────────
    // Maps user intent to a pre-built SQL query.
    // This runs BEFORE the LLM, so GPT-4o never has to guess the query.
    private static String detectSql(String query, String repo) {
        String q = query.toLowerCase().trim();

        // ── METRIC SUMMARY intents (use sonar.project_measures) ──────────────
        boolean wantsBugs           = matches(q, "bug count", "how many bugs", "number of bugs", "metric for bugs");
        boolean wantsVulns          = matches(q, "vuln count", "how many vulnerabilities", "number of security issues", "metric for vulnerabilities");
        boolean wantsSmells         = matches(q, "smell count", "how many code smells", "metric for smells");
        boolean wantsCoverage       = matches(q, "test coverage percentage", "coverage metric");
        boolean wantsRating         = matches(q, "security rating metric", "reliability rating metric", "maintainability rating");
        boolean wantsDuplication    = matches(q, "duplication percentage", "density");
        boolean wantsNcloc          = matches(q, "total lines of code", "ncloc metric", "line count");
        boolean wantsDebt           = matches(q, "total technical debt", "sqale index");
        boolean wantsSummary        = matches(q, "give me a full summary", "overview of all metrics");

        // ── DETAIL / LIST intents (use sonar.issues) ─────────────────────────
        // NOTE: every phrase in HELP_MESSAGE must be matched here
        boolean wantsList           = matches(q, "list", "show each", "specific", "details", "detail",
                                              "describe", "explain", "what are the", "the issues", "the bugs", "the vulnerabilities");

        // ── QUALITY GATE intent ───────────────────────────────────────────────
        boolean wantsGate           = matches(q, "quality gate", "gate", "passed", "failed gate", "gate status");

        // ── HOTSPOT intent ────────────────────────────────────────────────────
        boolean wantsHotspot        = matches(q, "hotspot", "hotspots", "security hotspot");

        // ── OTHER SYSTEMS intents ─────────────────────────────────────────────
        boolean wantsSentry         = matches(q, "sentry", "sentry issues", "sentry errors", "sentry events", "errors in sentry");
        boolean wantsLinear         = matches(q, "linear", "linear issues", "tasks in linear", "linear tasks");
        boolean wantsGithub         = matches(q, "github", "github issues", "github pulls", "pull requests", "prs", "open issues", "github pr");
        
        // ── HACKATHON DEMO intents ────────────────────────────────────────────
        boolean wantsCrossJoin      = matches(q, "discover the schemas", "discover the schema", "cross-platform join", "join demo", "map");
        // NOTE: "sonarqube metrics", "sonar metrics", "metrics" all map to wantsQuality (fast-path SQL)
        boolean wantsQuality        = matches(q, "quality", "sonarqube metrics", "sonar metrics",
                                              "metrics", "sonarqube", "sonar quality",
                                              "why is project quality poor", "analyze project quality");

        // Map the frontend repo name to the actual SonarQube project key
        if ("demo-project".equals(repo)) {
            repo = "ravindhar1108_demo-project";
        }

        // ── Build specific metric key string ──────────────────────────────────
        if (wantsCrossJoin) {
            String[] parts = repo.split("_", 2);
            String ghOwner = parts.length > 0 ? parts[0] : "";
            String ghRepo = parts.length > 1 ? parts[1] : "";
            
            return "SELECT s.title AS Sentry_Error, l.title AS Linear_Task, g.title AS Github_Issue " +
                   "FROM sentry.issues s " +
                   "LEFT JOIN linear.issues l ON l.title LIKE '%' || split_part(s.title, ':', 1) || '%' " +
                   "LEFT JOIN github.issues g ON g.title LIKE '%' || split_part(s.title, ':', 1) || '%' " +
                   "AND g.owner = '" + ghOwner + "' AND g.repo = '" + ghRepo + "';";
        }
        if (wantsQuality) {
            return "SELECT metric, value FROM sonar.project_measures " +
                   "WHERE component = '" + repo + "' " +
                   "AND \"metricKeys\" = 'bugs,vulnerabilities,code_smells,coverage," +
                   "security_rating,reliability_rating,sqale_rating," +
                   "duplicated_lines_density,ncloc,sqale_index,sqale_debt_ratio,alert_status,security_hotspots,violations' LIMIT 20;";
        }
        if (wantsSummary) {
            return "SELECT metric, value FROM sonar.project_measures " +
                   "WHERE component = '" + repo + "' " +
                   "AND \"metricKeys\" = 'ncloc,complexity,violations' LIMIT 5;";
        }
        if (wantsGate) {
            return "SELECT status, \"metricKey\", \"actualValue\" FROM sonar.qualitygates_status " +
                   "WHERE \"projectKey\" = '" + repo + "' LIMIT 5;";
        }
        if (wantsHotspot) {
            return "SELECT message, status, \"vulnerabilityProbability\", \"creationDate\" FROM sonar.hotspots " +
                   "WHERE \"projectKey\" = '" + repo + "' LIMIT 5;";
        }
        if (wantsList || q.contains("what is the bug") || q.contains("which bug")) {
            String typeFilter = "";
            if (q.contains("smell")) {
                typeFilter = " AND type = 'CODE_SMELL'";
            } else if (q.contains("bug")) {
                typeFilter = " AND type = 'BUG'";
            } else if (q.contains("vuln") || q.contains("security")) {
                typeFilter = " AND type = 'VULNERABILITY'";
            }
            return "SELECT message, severity, type, rule FROM sonar.issues " +
                   "WHERE projects = '" + repo + "'" + typeFilter + " LIMIT 5;";
        }
        if (wantsSentry) {
            return "SELECT title, status, level, project FROM sentry.issues LIMIT 5;";
        }
        if (q.contains("github pull") || wantsGithub) {
            String[] parts = repo.split("_", 2);
            String ghOwner = parts.length > 0 ? parts[0] : "";
            String ghRepo = parts.length > 1 ? parts[1] : "";
            
            if (q.contains("github pull")) {
                return "SELECT number, title, state, \"user__login\" AS author FROM github.pulls " +
                       "WHERE owner = '" + ghOwner + "' AND repo = '" + ghRepo + "' LIMIT 10;";
            } else {
                return "SELECT number, title, state, \"user__login\" AS author FROM github.issues " +
                       "WHERE owner = '" + ghOwner + "' AND repo = '" + ghRepo + "' LIMIT 10;";
            }
        }
        if (wantsLinear) {
            return "SELECT title, state_name AS status, assignee_name AS assignee, priority FROM linear.issues LIMIT 4;";
        }

        // Build metric key string for sonar.project_measures
        java.util.List<String> metricKeys = new java.util.ArrayList<>();
        if (wantsBugs)        metricKeys.add("bugs");
        if (wantsVulns)       metricKeys.add("vulnerabilities");
        if (wantsSmells)      metricKeys.add("code_smells");
        if (wantsCoverage)    metricKeys.add("coverage");
        if (wantsRating)      metricKeys.addAll(java.util.Arrays.asList("security_rating", "reliability_rating", "sqale_rating"));
        if (wantsDuplication) metricKeys.add("duplicated_lines_density");
        if (wantsNcloc)       metricKeys.add("ncloc");
        if (wantsDebt)        metricKeys.add("sqale_index");

        if (!metricKeys.isEmpty()) {
            return "SELECT metric, value FROM sonar.project_measures " +
                   "WHERE component = '" + repo + "' " +
                   "AND \"metricKeys\" = '" + String.join(",", metricKeys) + "' LIMIT 10;";
        }

        return null; // No intent matched — let the LLM figure it out
    }

    private static boolean matches(String query, String... keywords) {
        for (String kw : keywords) {
            if (query.contains(kw)) return true;
        }
        return false;
    }

    private static final String HELP_MESSAGE =
        "I'm not sure what you're asking. Here's what I can help with:\n\n" +
        "📊 **Metrics (single word works!):**\n" +
        "  • bugs  • vulnerabilities  • code smells  • coverage\n" +
        "  • security rating  • lines of code  • technical debt\n\n" +
        "📋 **Issue Details:**\n" +
        "  • \"list the bugs\"  • \"show specific vulnerabilities\"  • \"describe the issues\"\n\n" +
        "🏁 **Quality Gate:**\n" +
        "  • \"quality gate status\"  • \"did the gate pass?\"\n\n" +
        "🔥 **Security Hotspots:**\n" +
        "  • \"security hotspots\"\n\n" +
        "📈 **Full Report:**\n" +
        "  • \"give me a summary\"  • \"full analysis\"  • \"repository health\"";

    // ─────────────────────────────────────────────────────────────────────────

    public AgentController(ChatClient.Builder chatClientBuilder, java.util.List<org.springframework.ai.tool.ToolCallbackProvider> toolProviders) {
        java.util.List<org.springframework.ai.tool.ToolCallback> allTools = new java.util.ArrayList<>();
        for (org.springframework.ai.tool.ToolCallbackProvider provider : toolProviders) {
            allTools.addAll(java.util.Arrays.asList(provider.getToolCallbacks()));
        }
        System.out.println("\n\n=======================================================");
        System.out.println("NUMBER OF MCP TOOLS LOADED: " + allTools.size());
        for (org.springframework.ai.tool.ToolCallback tool : allTools) {
            System.out.println(" - " + tool.getToolDefinition().name());
        }
        System.out.println("=======================================================\n\n");
        org.springframework.ai.chat.memory.ChatMemory chatMemory = org.springframework.ai.chat.memory.MessageWindowChatMemory.builder()
                .maxMessages(100)
                .chatMemoryRepository(new org.springframework.ai.chat.memory.InMemoryChatMemoryRepository())
                .build();

        this.chatClient = chatClientBuilder
                .defaultToolCallbacks(allTools.toArray(new org.springframework.ai.tool.ToolCallback[0]))
                .defaultAdvisors(org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
        this.allTools = allTools;
    }

    @GetMapping("/api/investigate")
    public String investigate(@RequestParam String repoName, @RequestParam String query, @RequestParam(required = false, defaultValue = "false") boolean raw) {
        System.out.println("INVESTIGATE CALLED: repo=" + repoName + " query=" + query + " raw=" + raw);
        if (raw) {
            String detectedSql = detectSql(query, repoName);
            System.out.println("DETECTED SQL: " + detectedSql);
            if (detectedSql != null) {
                try {
                    org.springframework.ai.tool.ToolCallback sqlTool = this.allTools.stream()
                        .filter(t -> t.getToolDefinition().name().contains("sql"))
                        .findFirst()
                        .orElse(null);
                    
                    if (sqlTool != null) {
                        String safeSql = detectedSql.replace("\"", "\\\"").replace("\n", " ");
                        String jsonArgs = "{\"sql\": \"" + safeSql + "\"}";
                        String toolResult = sqlTool.call(jsonArgs);
                        
                        // Parse MCP JSON format: [{"text": "{\"rows\": [...]}"}]
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(toolResult);
                        if (root.isArray() && root.size() > 0 && root.get(0).has("text")) {
                            root = mapper.readTree(root.get(0).path("text").asText());
                        }
                        com.fasterxml.jackson.databind.JsonNode rows = root.path("rows");
                        
                        if (rows.isArray()) {
                            return "```json\n" + mapper.writeValueAsString(rows) + "\n```";
                        }
                    }
                    return "```json\n[]\n```";
                } catch (Exception e) {
                    System.err.println("RAW PATH EXCEPTION: " + e.getMessage());
                    return "```json\n[]\n```";
                }
            }
            return "```json\n[]\n```";
        }

        // ── Hybrid Agent Logic ───────────────────────────────────────────────
        String detectedSql = detectSql(query, repoName);
        
        if (detectedSql == null) {
            // If it's a follow-up or general conversation, let the LLM handle it!
            try {
                String systemPrompt = "You are an Enterprise Intelligence Agent connected to SonarQube, GitHub, Linear, and Sentry via Coral federated SQL. The user is investigating the project '" + repoName + "'. IMPORTANT: The only available tables are: sonar.projects, sonar.issues, sonar.hotspots, sonar.project_measures, github.issues, linear.issues, sentry.issues. DO NOT guess any other table names. When querying 'sonar.projects', you MUST include the filter 'WHERE organization = ''ravindhar1108'''. When querying 'sonar.project_measures', use 'WHERE component = ''<project_name>''' (do not use 'project') and you MUST include 'AND \"metricKeys\" = ''bugs,vulnerabilities,code_smells,coverage''' or similar. When querying 'github.issues', valid columns are: number, title, state, body, user__login, html_url, created_at, updated_at, closed_at, repository. DO NOT use issue_type or any column not in that list. Do not use the search_catalog tool. You must use the provided SQL tools to fetch data and answer their question. Do not refuse.";
                return this.chatClient.prompt()
                    .system(systemPrompt)
                    .user(query)
                    .call()
                    .content();
            } catch (Exception e) {
                return "The AI engine encountered an error while answering your follow-up (possibly a rate limit): " + e.getMessage();
            }
        }

        try {
            org.springframework.ai.tool.ToolCallback sqlTool = this.allTools.stream()
                .filter(t -> t.getToolDefinition().name().contains("sql"))
                .findFirst()
                .orElse(null);

            if (sqlTool != null) {
                String safeSql = detectedSql.replace("\"", "\\\"").replace("\n", " ");
                String jsonArgs = "{\"sql\": \"" + safeSql + "\"}";
                String toolResult = sqlTool.call(jsonArgs);
                // Parse JSON to Markdown Table
                StringBuilder markdown = new StringBuilder();
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(toolResult);
                    
                    // Spring AI wraps the MCP tool response in an array of TextContent nodes
                    if (root.isArray() && root.size() > 0 && root.get(0).has("text")) {
                        String innerJson = root.get(0).path("text").asText();
                        root = mapper.readTree(innerJson);
                    }
                    
                    com.fasterxml.jackson.databind.JsonNode rows = root.path("rows");
                    
                    if (rows.isArray() && rows.size() > 0) {
                        java.util.Iterator<String> fieldNames = rows.get(0).fieldNames();
                        java.util.List<String> headers = new java.util.ArrayList<>();
                        while (fieldNames.hasNext()) {
                            headers.add(fieldNames.next());
                        }
                        
                        // Format as a proper Markdown Table
                        markdown.append("| ");
                        for (String header : headers) {
                            markdown.append(header.toUpperCase().replace("_", " ")).append(" | ");
                        }
                        markdown.append("\n| ");
                        for (int i = 0; i < headers.size(); i++) {
                            markdown.append("--- | ");
                        }
                        markdown.append("\n");
                        
                        // Rows
                        for (com.fasterxml.jackson.databind.JsonNode row : rows) {
                            markdown.append("| ");
                            for (String header : headers) {
                                String val = row.path(header).asText("—");
                                if (val.equals("null") || val.isEmpty()) val = "—";
                                markdown.append(val.replace("\n", " ").replace("|", "\\|")).append(" | ");
                            }
                            markdown.append("\n");
                        }
                    } else {
                        markdown.append("No data returned.\n");
                    }
                } catch (Exception ex) {
                    markdown.append(toolResult).append("\n");
                }
                
                String explanation = "This query executes a standard lookup against the federated database.";
                boolean isQualityReport = detectedSql.contains("alert_status") || detectedSql.contains("sqale_debt_ratio");
                if (isQualityReport) {
                    // Build a rich quality report instead of the generic list
                    markdown = new StringBuilder();
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper2 = new com.fasterxml.jackson.databind.ObjectMapper();
                        com.fasterxml.jackson.databind.JsonNode root2 = mapper2.readTree(toolResult);
                        if (root2.isArray() && root2.size() > 0 && root2.get(0).has("text")) {
                            root2 = mapper2.readTree(root2.get(0).path("text").asText());
                        }
                        com.fasterxml.jackson.databind.JsonNode rows2 = root2.path("rows");
                        java.util.Map<String, String> metricValues = new java.util.LinkedHashMap<>();
                        if (rows2.isArray()) {
                            for (com.fasterxml.jackson.databind.JsonNode r : rows2) {
                                String mk = r.path("metric").asText("");
                                String mv = r.path("value").asText("");
                                if (!mk.isEmpty()) metricValues.put(mk, mv);
                            }
                        }
                        markdown.append(formatSonarQualityReport(metricValues));
                    } catch (Exception ex) {
                        markdown.append(toolResult);
                    }
                    explanation = "This comprehensive query fetches 12 key SonarQube metrics for reliability, security, maintainability, coverage, and duplication from the project_measures federated table. Ratings (1-5) are mapped to letter grades A-E following the SonarQube standard.";
                } else if (detectedSql.contains("LEFT JOIN linear.issues i ON true")) {
                    explanation = "This query performs a federated CROSS JOIN. It connects GitHub Pull Requests to Linear Tasks using an unstructured join, and correlates them with the latest SonarQube bugs for this specific repository. This allows us to track an issue's complete lifecycle from detection to deployment.";
                } else if (detectedSql.contains("linear.issues")) {
                    explanation = "This query reaches directly into your Linear workspace via the federated database, fetching the title, exact workflow status, assignee, and priority of your most recent project tasks.";
                } else if (detectedSql.contains("sentry.issues")) {
                    explanation = "This queries your live Sentry error tracking database to pull the latest unhandled exceptions and performance bottlenecks currently affecting your production environment.";
                } else if (detectedSql.contains("ncloc,complexity,violations")) {
                    explanation = "This query pulls high-level complexity and lines-of-code metrics from SonarQube to give a quick overview of the codebase's maintainability.";
                } else if (detectedSql.contains("sonar.qualitygates_status")) {
                    explanation = "This queries the SonarQube quality gates status table to determine exactly which metrics (like code coverage or duplication) are currently causing the build to fail.";
                } else if (detectedSql.contains("sonar.hotspots")) {
                    explanation = "This query isolates Security Hotspots from the SonarQube database, allowing us to review potential vulnerabilities and their probability of exploitation before they are merged.";
                } else if (detectedSql.contains("CODE_SMELL")) {
                    explanation = "This filters the SonarQube issues table specifically for 'CODE_SMELL' types, helping us identify technical debt and maintainability issues across the codebase.";
                } else if (detectedSql.contains("'BUG'")) {
                    explanation = "This query searches the SonarQube issues table for high-priority logic errors and bugs detected in the code, returning the specific rule violations.";
                } else if (detectedSql.contains("'VULNERABILITY'")) {
                    explanation = "This query filters the SonarQube issues table for critical security vulnerabilities, allowing us to pinpoint exactly where the codebase is exposed to attack.";
                }
                
                return "Here is the data I found for you:\n\n" + markdown.toString() +
                       "<SQL>\n" + detectedSql + "\n</SQL>\n" +
                       "<EXPLANATION>\n" + explanation + "\n</EXPLANATION>";
            }
        } catch (Exception e) {
            System.err.println("Direct tool execution failed: " + e.getMessage());
            return "⚠️ Tool execution failed: " + e.getMessage();
        }
        
        return "⚠️ Tool execution failed.";
    }


    @org.springframework.web.bind.annotation.ExceptionHandler(Exception.class)
    public org.springframework.http.ResponseEntity<String> handleException(Exception e) {
        java.io.StringWriter sw = new java.io.StringWriter();
        java.io.PrintWriter pw = new java.io.PrintWriter(sw);
        e.printStackTrace(pw);
        return org.springframework.http.ResponseEntity.status(500).body("Error: " + e.getMessage() + "\n\nStacktrace:\n" + sw.toString());
    }
    private static String parseMarkdownTableToJson(String input) {
        if (input == null || input.trim().isEmpty()) return "[]";
        String text = input.trim();
        // If it already looks like a JSON array, return it directly
        if (text.startsWith("[")) {
            try {
                new com.fasterxml.jackson.databind.ObjectMapper().readTree(text);
                return text;
            } catch (Exception ignored) {}
        }
        // Extract JSON array from markdown fences like ```json [...] ```
        if (text.contains("```json")) {
            try {
                String inner = text.split("```json")[1].split("```")[0].trim();
                new com.fasterxml.jackson.databind.ObjectMapper().readTree(inner);
                return inner;
            } catch (Exception ignored) {}
        }
        // Extract any JSON array embedded in prose
        int bracketStart = text.indexOf('[');
        int bracketEnd = text.lastIndexOf(']');
        if (bracketStart >= 0 && bracketEnd > bracketStart) {
            String candidate = text.substring(bracketStart, bracketEnd + 1);
            try {
                new com.fasterxml.jackson.databind.ObjectMapper().readTree(candidate);
                return candidate;
            } catch (Exception ignored) {}
        }
        // Parse Steampipe-style markdown table: +---+---+
        if (!text.contains("+---") && !text.contains("+--")) return "[]";
        String[] lines = text.split("\n");
        java.util.List<String> headers = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String, String>> rows = new java.util.ArrayList<>();
        boolean readingHeaders = false;
        boolean readingData = false;
        for (String line : lines) {
            line = line.trim();
            if (line.startsWith("+--")) {
                if (!readingHeaders) { readingHeaders = true; continue; }
                if (!readingData) { readingData = true; continue; }
                break;
            }
            if (line.startsWith("|") && line.endsWith("|")) {
                String[] parts = line.substring(1, line.length() - 1).split("\\|");
                if (readingHeaders && !readingData) {
                    for (String part : parts) headers.add(part.trim());
                } else if (readingData) {
                    java.util.Map<String, String> row = new java.util.LinkedHashMap<>();
                    for (int i = 0; i < parts.length && i < headers.size(); i++) {
                        row.put(headers.get(i), parts[i].trim());
                    }
                    rows.add(row);
                }
            }
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(rows);
        } catch (Exception e) {
            return "[]";
        }
    }

    // ── Rich SonarQube Quality Report Formatter ───────────────────────────────
    private static String formatSonarQualityReport(java.util.Map<String, String> mv) {
        StringBuilder sb = new StringBuilder();

        // Helper to decode rating number → letter grade
        java.util.function.Function<String, String> ratingGrade = val -> {
            try {
                int r = (int) Double.parseDouble(val);
                switch (r) {
                    case 1: return "A ✅";
                    case 2: return "B 🟡";
                    case 3: return "C 🟠";
                    case 4: return "D 🔴";
                    case 5: return "E ⛔";
                    default: return val;
                }
            } catch (Exception e) { return val; }
        };

        // Quality Gate Status
        String gate = mv.getOrDefault("alert_status", "");
        if (!gate.isEmpty()) {
            String gateIcon = "OK".equalsIgnoreCase(gate) ? "✅ PASSED" : "❌ FAILED";
            sb.append("## Quality Gate: ").append(gateIcon).append("\n\n");
        } else {
            sb.append("## SonarQube Quality Report\n\n");
        }

        // ── Reliability ──────────────────────────────────────────────────────
        sb.append("### 🐛 Reliability\n");
        String bugs = mv.getOrDefault("bugs", "—");
        String relRating = ratingGrade.apply(mv.getOrDefault("reliability_rating", ""));
        sb.append("| Metric | Value | Rating |\n|--------|-------|--------|\n");
        sb.append("| **Bugs** | `").append(bugs).append("` | ").append(relRating).append(" |\n");
        sb.append("\n> **Bugs** are coding mistakes that will break your application at runtime. ")
          .append(bugs.equals("0") ? "🎉 No bugs detected — great reliability!" : "⚠️ " + bugs + " bug(s) should be fixed before the next release.")
          .append("\n\n");

        // ── Security ─────────────────────────────────────────────────────────
        sb.append("### 🔐 Security\n");
        String vulns = mv.getOrDefault("vulnerabilities", "—");
        String secRating = ratingGrade.apply(mv.getOrDefault("security_rating", ""));
        sb.append("| Metric | Value | Rating |\n|--------|-------|--------|\n");
        sb.append("| **Vulnerabilities** | `").append(vulns).append("` | ").append(secRating).append(" |\n");
        sb.append("\n> **Vulnerabilities** are security issues that attackers can exploit. ")
          .append(vulns.equals("0") ? "✅ No vulnerabilities found — secure codebase." : "🚨 " + vulns + " vulnerability/vulnerabilities need immediate attention.")
          .append("\n\n");

        // ── Maintainability ───────────────────────────────────────────────────
        sb.append("### 🧹 Maintainability\n");
        String smells = mv.getOrDefault("code_smells", "—");
        String sqaleRating = ratingGrade.apply(mv.getOrDefault("sqale_rating", ""));
        String debt = mv.getOrDefault("sqale_index", "—");
        String debtRatio = mv.getOrDefault("sqale_debt_ratio", "—");
        sb.append("| Metric | Value | Rating |\n|--------|-------|--------|\n");
        sb.append("| **Code Smells** | `").append(smells).append("` | ").append(sqaleRating).append(" |\n");
        sb.append("| **Technical Debt** | `").append(debt.equals("—") ? "—" : debt + " min").append("` | — |\n");
        sb.append("| **Debt Ratio** | `").append(debtRatio.equals("—") ? "—" : debtRatio + "%").append("` | — |\n");
        sb.append("\n> **Code Smells** are maintainability issues that make the code harder to change. Technical debt of ")
          .append(debt.equals("—") ? "N/A" : formatDebt(debt))
          .append(" estimated to fix.\n\n");

        // ── Coverage ──────────────────────────────────────────────────────────
        sb.append("### 🧪 Test Coverage\n");
        String cov = mv.getOrDefault("coverage", "—");
        String covIcon;
        try {
            double c = Double.parseDouble(cov);
            covIcon = c >= 80 ? "✅ Good" : c >= 60 ? "🟡 Acceptable" : c >= 40 ? "🟠 Needs improvement" : "🔴 Critical";
        } catch (Exception e) { covIcon = "—"; }
        sb.append("| Metric | Value | Status |\n|--------|-------|--------|\n");
        sb.append("| **Line Coverage** | `").append(cov.equals("—") ? "—" : cov + "%").append("` | ").append(covIcon).append(" |\n");
        sb.append("\n> Industry best practice is **≥ 80% coverage**. ")
          .append(cov.equals("—") ? "Coverage data unavailable." : "Your project is at " + cov + "%.")
          .append("\n\n");

        // ── Duplication ───────────────────────────────────────────────────────
        sb.append("### 📋 Duplication\n");
        String dup = mv.getOrDefault("duplicated_lines_density", "—");
        String dupIcon;
        try {
            double d = Double.parseDouble(dup);
            dupIcon = d <= 3 ? "✅ Excellent" : d <= 10 ? "🟡 Acceptable" : d <= 20 ? "🟠 High" : "🔴 Very High";
        } catch (Exception e) { dupIcon = "—"; }
        sb.append("| Metric | Value | Status |\n|--------|-------|--------|\n");
        sb.append("| **Duplicated Lines** | `").append(dup.equals("—") ? "—" : dup + "%").append("` | ").append(dupIcon).append(" |\n");
        sb.append("\n> Duplicated code increases maintenance effort. Keep duplication **< 3%** for a clean codebase.\n\n");

        // ── Codebase Size ─────────────────────────────────────────────────────
        String ncloc = mv.getOrDefault("ncloc", "—");
        if (!ncloc.equals("—")) {
            sb.append("### 📏 Codebase Size\n");
            sb.append("| Metric | Value |\n|--------|-------|\n");
            sb.append("| **Lines of Code** | `").append(ncloc).append("` |\n\n");
        }

        // ── Summary ───────────────────────────────────────────────────────────
        sb.append("---\n");
        sb.append("_Data fetched live from SonarQube via Coral federated SQL · Ratings: A=Best, E=Worst_\n");

        return sb.toString();
    }

    private static String formatDebt(String minutes) {
        try {
            int m = Integer.parseInt(minutes);
            if (m < 60) return m + " minutes";
            if (m < 480) return (m / 60) + "h " + (m % 60) + "m";
            return (m / 480) + "d " + ((m % 480) / 60) + "h";
        } catch (Exception e) { return minutes + " min"; }
    }

}
