"use client";

import { useCallback } from "react";
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Database, GitCommit, GitPullRequest, LayoutDashboard, SearchCode, 
  TriangleAlert, Server, Cpu, Network, ShieldCheck, Box, TableProperties, Wrench
} from "lucide-react";

// Custom Node Style for a Glowing Neon Aesthetic
const customNodeStyle = (color: string, width: string = "220px") => ({
  background: "#0a0a0a",
  color: "#fff",
  border: `1px solid ${color}40`,
  borderRadius: "12px",
  padding: "16px",
  minWidth: width,
  boxShadow: `0 0 20px ${color}15`,
  fontSize: "14px",
  fontWeight: 500,
});

const CustomLabel = ({ icon: Icon, color, title, subtitle }: { icon: any, color: string, title: string, subtitle: string }) => (
  <div className="flex flex-col items-center">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 border`} style={{ backgroundColor: `${color}20`, borderColor: `${color}50` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <span className="font-bold" style={{ color }}>{title}</span>
    <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest text-center">{subtitle}</span>
  </div>
);

// Extremely complex node graph
const initialNodes = [
  // --- CLIENT / GATEWAY LAYER ---
  { id: "ui", position: { x: 400, y: 0 }, data: { label: <CustomLabel icon={Box} color="#fff" title="CoralOps UI" subtitle="Next.js Frontend" /> }, style: customNodeStyle("#ffffff") },
  { id: "api_gw", position: { x: 400, y: 150 }, data: { label: <CustomLabel icon={Network} color="#818cf8" title="API Gateway" subtitle="Spring Boot Router" /> }, style: customNodeStyle("#818cf8") },
  { id: "auth", position: { x: 650, y: 150 }, data: { label: <CustomLabel icon={ShieldCheck} color="#fcd34d" title="Auth Service" subtitle="JWT Verification" /> }, style: customNodeStyle("#fcd34d", "180px") },
  
  // --- AGENT LAYER ---
  { id: "agent", position: { x: 400, y: 300 }, data: { label: <CustomLabel icon={Cpu} color="#a78bfa" title="Intelligence Agent" subtitle="Spring AI / Gemini" /> }, style: customNodeStyle("#a78bfa") },
  
  // --- MCP TOOL LAYER ---
  { id: "tool_sql", position: { x: 200, y: 450 }, data: { label: <CustomLabel icon={Wrench} color="#fb923c" title="Execute SQL" subtitle="MCP Tool" /> }, style: customNodeStyle("#fb923c", "160px") },
  { id: "tool_catalog", position: { x: 400, y: 450 }, data: { label: <CustomLabel icon={Wrench} color="#fb923c" title="List Catalog" subtitle="MCP Tool" /> }, style: customNodeStyle("#fb923c", "160px") },
  { id: "tool_desc", position: { x: 600, y: 450 }, data: { label: <CustomLabel icon={Wrench} color="#fb923c" title="Describe Table" subtitle="MCP Tool" /> }, style: customNodeStyle("#fb923c", "160px") },

  // --- CORAL CORE LAYER ---
  { id: "coral", position: { x: 400, y: 650 }, data: { label: <CustomLabel icon={SearchCode} color="#34d399" title="Coral MCP Engine" subtitle="Federated SQL Parser" /> }, style: customNodeStyle("#34d399", "250px") },
  
  // --- DATASOURCE LAYER ---
  { id: "github", position: { x: -50, y: 850 }, data: { label: <CustomLabel icon={GitPullRequest} color="#a3a3a3" title="GitHub" subtitle="REST API Proxy" /> }, style: customNodeStyle("#a3a3a3") },
  { id: "sonar", position: { x: 250, y: 850 }, data: { label: <CustomLabel icon={Database} color="#60a5fa" title="SonarQube" subtitle="REST API Proxy" /> }, style: customNodeStyle("#60a5fa") },
  { id: "linear", position: { x: 550, y: 850 }, data: { label: <CustomLabel icon={LayoutDashboard} color="#c084fc" title="Linear" subtitle="GraphQL Proxy" /> }, style: customNodeStyle("#c084fc") },
  { id: "sentry", position: { x: 850, y: 850 }, data: { label: <CustomLabel icon={TriangleAlert} color="#f87171" title="Sentry" subtitle="REST API Proxy" /> }, style: customNodeStyle("#f87171") },

  // --- VIRTUAL TABLES LAYER (GitHub) ---
  { id: "gh_pr", position: { x: -150, y: 1050 }, data: { label: <CustomLabel icon={TableProperties} color="#a3a3a3" title="github.pull_requests" subtitle="Virtual Table" /> }, style: customNodeStyle("#a3a3a3", "180px") },
  { id: "gh_issues", position: { x: 50, y: 1050 }, data: { label: <CustomLabel icon={TableProperties} color="#a3a3a3" title="github.issues" subtitle="Virtual Table" /> }, style: customNodeStyle("#a3a3a3", "180px") },
  
  // --- VIRTUAL TABLES LAYER (SonarQube) ---
  { id: "sq_measures", position: { x: 250, y: 1050 }, data: { label: <CustomLabel icon={TableProperties} color="#60a5fa" title="sonar.measures" subtitle="Virtual Table" /> }, style: customNodeStyle("#60a5fa", "180px") },
  
  // --- VIRTUAL TABLES LAYER (Linear) ---
  { id: "lin_issues", position: { x: 550, y: 1050 }, data: { label: <CustomLabel icon={TableProperties} color="#c084fc" title="linear.issues" subtitle="Virtual Table" /> }, style: customNodeStyle("#c084fc", "180px") },
  
  // --- VIRTUAL TABLES LAYER (Sentry) ---
  { id: "sntry_events", position: { x: 850, y: 1050 }, data: { label: <CustomLabel icon={TableProperties} color="#f87171" title="sentry.events" subtitle="Virtual Table" /> }, style: customNodeStyle("#f87171", "180px") },
];

const animatedEdge = (source: string, target: string, color: string) => ({
  id: `e-${source}-${target}`,
  source,
  target,
  animated: true,
  style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
});

const staticEdge = (source: string, target: string, color: string) => ({
  id: `e-${source}-${target}`,
  source,
  target,
  animated: false,
  style: { stroke: color, strokeWidth: 1, strokeDasharray: "5, 5", opacity: 0.3 },
});

const initialEdges = [
  // Client to Gateway
  animatedEdge("ui", "api_gw", "#818cf8"),
  staticEdge("api_gw", "auth", "#fcd34d"),
  
  // Gateway to Agent
  animatedEdge("api_gw", "agent", "#a78bfa"),
  
  // Agent to Tools
  animatedEdge("agent", "tool_sql", "#fb923c"),
  animatedEdge("agent", "tool_catalog", "#fb923c"),
  animatedEdge("agent", "tool_desc", "#fb923c"),
  
  // Tools to Coral
  animatedEdge("tool_sql", "coral", "#34d399"),
  animatedEdge("tool_catalog", "coral", "#34d399"),
  animatedEdge("tool_desc", "coral", "#34d399"),
  
  // Coral to APIs
  animatedEdge("coral", "github", "#a3a3a3"),
  animatedEdge("coral", "sonar", "#60a5fa"),
  animatedEdge("coral", "linear", "#c084fc"),
  animatedEdge("coral", "sentry", "#f87171"),
  
  // APIs to Virtual Tables
  staticEdge("github", "gh_pr", "#a3a3a3"),
  staticEdge("github", "gh_issues", "#a3a3a3"),
  staticEdge("sonar", "sq_measures", "#60a5fa"),
  staticEdge("linear", "lin_issues", "#c084fc"),
  staticEdge("sentry", "sntry_events", "#f87171"),
];

export default function WorkflowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="flex-1 bg-[#050505] text-neutral-200 relative">
      <div className="absolute top-8 left-8 z-10 pointer-events-none bg-[#050505]/80 p-6 rounded-2xl border border-[#222] backdrop-blur-md">
        <h1 className="text-3xl font-semibold text-white tracking-tight">System Architecture</h1>
        <p className="text-neutral-500 mt-1 mb-4">Complete Execution Topology</p>
        
        <div className="flex flex-col space-y-2 mt-4 text-xs font-mono">
          <div className="flex items-center text-neutral-400"><div className="w-2 h-2 rounded-full bg-[#818cf8] mr-2"></div> UI/API Layer</div>
          <div className="flex items-center text-neutral-400"><div className="w-2 h-2 rounded-full bg-[#a78bfa] mr-2"></div> Intelligence Layer</div>
          <div className="flex items-center text-neutral-400"><div className="w-2 h-2 rounded-full bg-[#fb923c] mr-2"></div> MCP Capabilities</div>
          <div className="flex items-center text-neutral-400"><div className="w-2 h-2 rounded-full bg-[#34d399] mr-2"></div> Federation Engine</div>
        </div>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-[#050505]"
        colorMode="dark"
        minZoom={0.2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#333" />
        <Controls className="bg-neutral-900 border-neutral-800 fill-white mb-6 mr-6" />
      </ReactFlow>
    </div>
  );
}
