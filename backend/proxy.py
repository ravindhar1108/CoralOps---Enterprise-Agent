from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.request
import json
from urllib.parse import urlparse, parse_qs

class ProxyHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = "https://sonarcloud.io" + self.path
        
        # Forward the Bearer token perfectly
        headers = {}
        if self.headers.get('Authorization'):
            headers['Authorization'] = self.headers.get('Authorization')
            
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
            parsed_path = urlparse(self.path).path
            
            # --- DATA NORMALIZATION MIDDLEWARE ---
            
            if parsed_path == "/api/measures/component":
                comp = data.get("component", {})
                measures = comp.get("measures", [])
                
                # Flatten the metric array into a single flat database row!
                flat_row = {"component": comp.get("key", "")}
                for m in measures:
                    val = m.get("value")
                    try: val = int(val)
                    except: pass
                    flat_row[m.get("metric")] = val
                
                # Return as an array so Coral can map it natively
                final_data = [flat_row]
                
            elif parsed_path == "/api/issues/search":
                # Extract the issues array directly to the root
                final_data = data.get("issues", [])
                
            elif parsed_path == "/api/projects/search":
                # Extract components directly to the root
                final_data = data.get("components", [])
                
            else:
                final_data = data
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(final_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

if __name__ == '__main__':
    print("Starting SonarCloud Normalization Middleware on port 5050...")
    HTTPServer(('', 5050), ProxyHTTPRequestHandler).serve_forever()
