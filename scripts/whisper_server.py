#!/usr/bin/env python3
"""
Persistent local Whisper transcription server.
Keeps the model loaded in memory for near-instant transcription.
Listens on http://localhost:8787
"""

import sys
import os
import json
import tempfile
import time
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler

if not shutil.which("ffmpeg"):
    print("[whisper-server] ERROR: FFmpeg is not installed or not found in system PATH. Whisper requires FFmpeg to transcribe audio.", flush=True)
    print("[whisper-server] Please install FFmpeg (e.g. 'scoop install ffmpeg' on Windows or 'brew install ffmpeg' on Mac) and restart.", flush=True)
    sys.exit(1)


# Load whisper once at startup
print("[whisper-server] Loading whisper model...", flush=True)
import whisper

MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")
LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "en")

model = whisper.load_model(MODEL_NAME)
print(f"[whisper-server] Model '{MODEL_NAME}' loaded and ready!", flush=True)


class TranscribeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default logging noise
        pass

    def do_POST(self):
        if self.path == "/transcribe":
            content_length = int(self.headers.get("Content-Length", 0))
            audio_data = self.rfile.read(content_length)

            # Write audio to temp file
            tmp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
            tmp.write(audio_data)
            tmp.close()

            try:
                start = time.time()
                lang = self.headers.get("X-Language", LANGUAGE)
                opts = {
                    "fp16": False,
                    "condition_on_previous_text": False
                }
                if lang and lang != "auto":
                    opts["language"] = lang

                result = model.transcribe(tmp.name, **opts)
                
                valid_texts = []
                for segment in result.get("segments", []):
                    if segment.get("no_speech_prob", 0.0) < 0.6:
                        valid_texts.append(segment.get("text", ""))
                        
                text = " ".join(valid_texts).strip()
                elapsed = time.time() - start

                if text:
                    print(f"[whisper-server] [{elapsed:.1f}s] {text}", flush=True)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "text": text,
                    "duration": elapsed
                }).encode())
            except ConnectionError:
                print("[whisper-server] Client disconnected before receiving response.", flush=True)
            except Exception as e:
                print(f"[whisper-server] Error: {e}", flush=True)
                try:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
                except Exception:
                    pass
            finally:
                os.unlink(tmp.name)

        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": MODEL_NAME}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": MODEL_NAME}).encode())
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 8787))
    server = HTTPServer(("127.0.0.1", port), TranscribeHandler)
    print(f"[whisper-server] Listening on http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[whisper-server] Shutting down.", flush=True)
        server.server_close()
