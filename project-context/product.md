# AI Expense Tracker

## Overview

AI-powered expense tracking mobile application built using React Native CLI and Node.js.

The application allows users to:

- Manually manage expenses through UI
- Automatically create expenses from payment-related SMS messages
- Visualize spending trends using charts
- Interact with an AI chatbot to manage expenses through natural language
- Use MCP tools so the chatbot can perform actions on behalf of the user

## Problem Statement

Most users do not consistently track expenses because manual entry is tedious.

The goal is to reduce friction by:

1. Allowing manual expense management.
2. Automatically detecting expenses from payment SMS messages.
3. Providing a conversational interface for expense management.

## Target Users

- Students
- Professionals
- Freelancers
- Individuals who want better visibility into spending

## Core Features

### Expense Management

- Create expense
- View expense list
- Update expense
- Delete expense

### Analytics

- Monthly spending chart
- Category-wise spending chart
- Monthly summary

### SMS Expense Detection

- Detect incoming payment SMS
- Extract merchant name
- Extract amount
- Categorize transaction
- Create expense automatically

### AI Chatbot

User can:

- Add expenses
- Update expenses
- Delete expenses
- Query spending summaries
- Ask questions about spending patterns

## Future Features

- Subscription detection
- Budget planning
- Recurring expenses
- Smart categorization using AI
- Receipt scanning
- Bank/email integrations

## Technology Stack

Frontend:
- React Native CLI
- TypeScript
- React Navigation
- Redux Toolkit
- React Native Paper

Backend:
- Node.js
- Express.js
- MongoDB
- Mongoose

Infrastructure:
- Docker
- GitHub Actions

AI:
- MCP Server
- LLM Integration

## Non-Goals

- Banking application
- Investment management
- Direct integration with payment providers in MVP