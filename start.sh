#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         AI Sales Outreach Platform - Startup Script       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Define ports
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_PORT=5432

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        echo -e "${GREEN}Port $port cleared.${NC}"
    else
        echo -e "${GREEN}Port $port is already free.${NC}"
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            echo -e "${GREEN}PostgreSQL is running.${NC}"
            return 0
        else
            echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"
            if command -v brew &> /dev/null; then
                brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
            elif command -v systemctl &> /dev/null; then
                sudo systemctl start postgresql
            elif command -v pg_ctl &> /dev/null; then
                pg_ctl start -D /usr/local/var/postgres
            fi
            sleep 2
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
    echo -e "${BLUE}Checking/Creating database...${NC}"

    # Try to create the database (will fail silently if it exists)
    createdb ai_sales_outreach 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Database 'ai_sales_outreach' created.${NC}"
    else
        echo -e "${GREEN}Database 'ai_sales_outreach' already exists.${NC}"
    fi
}

# Step 1: Clean up ports
echo -e "\n${BLUE}Step 1: Cleaning up ports...${NC}"
echo "================================"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Step 2: Check PostgreSQL
echo -e "\n${BLUE}Step 2: Checking PostgreSQL...${NC}"
echo "================================"
check_postgres
if [ $? -ne 0 ]; then
    echo -e "${RED}Cannot proceed without PostgreSQL. Exiting.${NC}"
    exit 1
fi

# Step 3: Create database
echo -e "\n${BLUE}Step 3: Setting up database...${NC}"
echo "================================"
create_database

# Step 4: Install dependencies
echo -e "\n${BLUE}Step 4: Installing dependencies...${NC}"
echo "================================"

# Navigate to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
fi

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}Frontend dependencies already installed.${NC}"
fi

# Step 5: Seed database
echo -e "\n${BLUE}Step 5: Seeding database...${NC}"
echo "================================"
cd "$PROJECT_DIR/backend"
npm run seed

# Step 6: Start services
echo -e "\n${BLUE}Step 6: Starting services...${NC}"
echo "================================"

# Start backend in background
echo -e "${YELLOW}Starting backend server on port $BACKEND_PORT...${NC}"
cd "$PROJECT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend in background
echo -e "${YELLOW}Starting frontend server on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_DIR/frontend"
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Application Started Successfully!            ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Frontend:  http://localhost:$FRONTEND_PORT                       ║"
echo "║  Backend:   http://localhost:$BACKEND_PORT/api                    ║"
echo "║                                                           ║"
echo "║  Login Credentials:                                       ║"
echo "║  Email:    john.smith@company.com                         ║"
echo "║  Password: password123                                    ║"
echo "║                                                           ║"
echo "║  Press Ctrl+C to stop all services                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}Services stopped. Goodbye!${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
wait
