from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
      def end_headers(self):
          self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
          super().end_headers()

if __name__ == '__main__':
      server = HTTPServer(('localhost', 8000), CustomHandler)
      print("Serving at http://localhost:8000")
      server.serve_forever()