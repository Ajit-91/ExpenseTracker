# Architecture

## High Level Architecture

Mobile App
    ↓
REST API
    ↓
Node.js Backend
    ↓
MongoDB

Chatbot
    ↓
MCP Server
    ↓
Expense APIs

## Components

### Mobile Application

Technology:
- React Native CLI
- TypeScript

Responsibilities:
- Authentication
- Expense CRUD
- Charts
- SMS detection
- Chat UI

### Backend

Technology:
- Node.js
- Express

Responsibilities:
- Expense APIs
- User APIs
- Analytics APIs
- Chat APIs

### Database

Technology:
- MongoDB

Collections:
- users
- expenses
- chat_sessions

### MCP Server

Responsibilities:
- Expose expense operations as tools
- Validate tool inputs
- Call backend services
- Return structured results

## Expense Flow

User Creates Expense
        ↓
React Native App
        ↓
POST /expenses
        ↓
Node Backend
        ↓
MongoDB

## SMS Flow

Incoming SMS
        ↓
SMS Parser
        ↓
Extract Amount
Extract Merchant
        ↓
Create Expense API
        ↓
MongoDB

## Chat Flow

User Message
        ↓
Chatbot
        ↓
LLM
        ↓
MCP Tool Selection
        ↓
Backend API
        ↓
Result Returned

## Deployment

Backend:
- Docker Container

Database:
- MongoDB

CI/CD:
- GitHub Actions

## Coding Principles

- Feature-based organization
- TypeScript everywhere
- Service layer pattern
- Validation at API boundary
- Reusable UI components