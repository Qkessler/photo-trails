# Photos on Trails

# Kill any processes on dev ports (3000, 3001)
clean-ports:
    -lsof -ti :3000 | xargs kill -9 2>/dev/null
    -lsof -ti :3001 | xargs kill -9 2>/dev/null
    @echo "Ports 3000 and 3001 cleared."

# Run the full dev environment (API server + Vite frontend with HMR)
dev: clean-ports
    #!/usr/bin/env bash
    set -e
    trap 'kill 0' EXIT
    PORT=3001 npm run dev:server 2>&1 | sed 's/^/[server] /' &
    echo "Waiting for API server..."
    for i in $(seq 1 10); do
      if curl -s -o /dev/null http://localhost:3001/api/activity 2>/dev/null; then
        echo "API server ready on :3001"
        break
      fi
      if [ $i -eq 10 ]; then
        echo "ERROR: API server failed to start on port 3001"
        exit 1
      fi
      sleep 1
    done
    npm run dev &
    wait

# Run tests
test:
    npx vitest run

# Run tests in watch mode
test-watch:
    npx vitest

# Build for production
build:
    npx vite build

# Export a static activity (provide a GPX file)
export gpx:
    curl -s -F "gpx=@{{gpx}}" http://localhost:3001/api/import-gpx && \
    curl -s http://localhost:3001/api/export -o activity-export.zip
