#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           AI Sales Outreach Platform - Startup Script             ║"
echo "║                     with Hot Reload Support                       ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Define ports (NOT using 5000)
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_PORT=5432

# Function to forcefully kill all processes on a specific port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Checking port $port...${NC}"

    # Try multiple methods to find and kill processes
    # Method 1: lsof
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port (PIDs: $pids)...${NC}"
        for pid in $pids; do
            kill -9 $pid 2>/dev/null
        done
        sleep 1
    fi

    # Method 2: fuser (if available)
    if command -v fuser &> /dev/null; then
        fuser -k $port/tcp 2>/dev/null
    fi

    # Method 3: netstat + grep (for stubborn processes)
    local more_pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$more_pids" ]; then
        for pid in $more_pids; do
            if [ "$pid" != "-" ]; then
                kill -9 $pid 2>/dev/null
            fi
        done
    fi

    # Verify port is free
    sleep 1
    if lsof -ti :$port &>/dev/null; then
        echo -e "${RED}Warning: Port $port may still be in use${NC}"
    else
        echo -e "${GREEN}Port $port is free.${NC}"
    fi
}

# Function to clean all used ports
clean_all_ports() {
    echo -e "\n${BLUE}Step 1: Cleaning up all used ports...${NC}"
    echo "========================================"
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT

    # Also kill any stray node processes related to our app
    pkill -f "tsx.*backend" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null

    echo -e "${GREEN}Port cleanup complete.${NC}"
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "\n${BLUE}Step 2: Checking PostgreSQL...${NC}"
    echo "================================"

    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            echo -e "${GREEN}PostgreSQL is running.${NC}"
            return 0
        else
            echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"
            if command -v brew &> /dev/null; then
                brew services start postgresql@15 2>/dev/null || \
                brew services start postgresql@14 2>/dev/null || \
                brew services start postgresql 2>/dev/null
            elif command -v systemctl &> /dev/null; then
                sudo systemctl start postgresql
            elif command -v pg_ctl &> /dev/null; then
                pg_ctl start -D /usr/local/var/postgres
            fi
            sleep 3
            if pg_isready -q; then
                echo -e "${GREEN}PostgreSQL started successfully.${NC}"
                return 0
            else
                echo -e "${RED}Failed to start PostgreSQL. Please start it manually.${NC}"
                return 1
            fi
        fi
    else
        echo -e "${YELLOW}pg_isready not found. Assuming PostgreSQL is running...${NC}"
        return 0
    fi
}

# Function to create database if it doesn't exist
create_database() {
    echo -e "\n${BLUE}Step 3: Setting up database...${NC}"
    echo "================================"

    # Try to create the database (will fail silently if it exists)
    createdb ai_sales_outreach 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Database 'ai_sales_outreach' created.${NC}"
    else
        echo -e "${GREEN}Database 'ai_sales_outreach' already exists.${NC}"
    fi
}

# Navigate to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

# Step 1: Clean up ports
clean_all_ports

# Step 2: Check PostgreSQL
check_postgres
if [ $? -ne 0 ]; then
    echo -e "${RED}Cannot proceed without PostgreSQL. Exiting.${NC}"
    exit 1
fi

# Step 3: Create database
create_database

# Step 4: Install dependencies
echo -e "\n${BLUE}Step 4: Installing dependencies...${NC}"
echo "====================================="

# Install backend dependencies
echo -e "${YELLOW}Checking backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
fi

# Install frontend dependencies
echo -e "${YELLOW}Checking frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}Frontend dependencies already installed.${NC}"
fi

# Step 5: Seed database with all features
echo -e "\n${BLUE}Step 5: Seeding database with sample data...${NC}"
echo "=============================================="
cd "$PROJECT_DIR/backend"
npm run seed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database seeded successfully with:${NC}"
    echo -e "  - 16 Users"
    echo -e "  - 16 Teams"
    echo -e "  - 20 Contacts"
    echo -e "  - 18 Email Templates"
    echo -e "  - 16 Campaigns"
    echo -e "  - 16 A/B Tests"
    echo -e "  - 16 Sequences"
    echo -e "  - 18 Meetings"
    echo -e "  - 20 Tasks"
    echo -e "  - 16 Integrations"
    echo -e "  - 25 Notifications"
    echo -e "  - 15 Reports"
    echo -e "  - ${CYAN}16 AI Lead Scores${NC}"
    echo -e "  - ${CYAN}16 AI Personalizations${NC}"
    echo -e "  - ${CYAN}16 AI Best Time Predictions${NC}"
    echo -e "  - ${CYAN}16 AI Objection Handlers${NC}"
    echo -e "  - ${CYAN}16 AI Pipeline Forecasts${NC}"
else
    echo -e "${RED}Database seeding failed. Check errors above.${NC}"
fi

# Step 6: Start services with hot reload
echo -e "\n${BLUE}Step 6: Starting services with hot reload...${NC}"
echo "=============================================="

# Start backend with tsx (supports hot reload for TypeScript)
echo -e "${YELLOW}Starting backend server on port $BACKEND_PORT with hot reload...${NC}"
cd "$PROJECT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start. Check errors above.${NC}"
    exit 1
fi

# Start frontend (React Scripts already has hot reload)
echo -e "${YELLOW}Starting frontend server on port $FRONTEND_PORT with hot reload...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              Application Started Successfully!                    ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║                                                                   ║"
echo "║  Frontend:  ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}                              ║"
echo "║  Backend:   ${CYAN}http://localhost:$BACKEND_PORT/api${GREEN}                           ║"
echo "║                                                                   ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║  Login Credentials:                                               ║"
echo "║  Email:    ${YELLOW}john.smith@company.com${GREEN}                                ║"
echo "║  Password: ${YELLOW}password123${GREEN}                                           ║"
echo "║                                                                   ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║  ${PURPLE}HOT RELOAD ENABLED${GREEN} - Changes will auto-refresh!                ║"
echo "║                                                                   ║"
echo "║  ${CYAN}AI Features Available:${GREEN}                                          ║"
echo "║  - AI Lead Scorer                                                 ║"
echo "║  - AI Personalization Engine                                      ║"
echo "║  - AI Best Time Predictor                                         ║"
echo "║  - AI Objection Handler                                           ║"
echo "║  - AI Pipeline Forecaster                                         ║"
echo "║                                                                   ║"
echo "║  Press ${RED}Ctrl+C${GREEN} to stop all services                               ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    # Kill our specific processes
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null

    # Clean up ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT

    # Kill any remaining node processes
    pkill -f "tsx.*backend" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null

    echo -e "${GREEN}Services stopped. Goodbye!${NC}"
    exit 0
}

# Trap Ctrl+C and other signals
trap cleanup SIGINT SIGTERM SIGHUP

# Keep script running and monitor processes
while true; do
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Backend process died. Restarting...${NC}"
        cd "$PROJECT_DIR/backend"
        npm run dev &
        BACKEND_PID=$!
    fi

    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}Frontend process died. Restarting...${NC}"
        cd "$PROJECT_DIR/frontend"
        BROWSER=none npm start &
        FRONTEND_PID=$!
    fi

    sleep 5
done
