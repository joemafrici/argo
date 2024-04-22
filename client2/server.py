import http.server
import socketserver
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        print(f"File modified: {event.src_path}")

def serve_files():
    PORT = 8001
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    observer = Observer()
    observer.schedule(Handler(), path=".", recursive=True)
    observer.start()

    try:
        serve_files()
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
