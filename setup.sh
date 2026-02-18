#!/bin/bash

echo "=========================================="
echo "  Rayees Family App - Setup Script"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend Setup
echo -e "\n${GREEN}Setting up Backend...${NC}"
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

echo -e "${GREEN}Backend setup complete!${NC}"

# Frontend Setup
echo -e "\n${GREEN}Setting up Frontend...${NC}"
cd ../frontend

# Install dependencies
npm install

echo -e "${GREEN}Frontend setup complete!${NC}"

echo -e "\n${YELLOW}=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo ""
echo "1. Update your OpenAI API key in backend/.env"
echo ""
echo "2. Start Backend (Terminal 1):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "3. Start Frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "Default Login Credentials:"
echo "  Parents:"
echo "    Rayees: rayees@family.com / rayees123"
echo "    Shibila: shibila@family.com / shibila123"
echo "  Kids (PIN: 1234):"
echo "    Kanz, Nouman"
echo "==========================================${NC}"
