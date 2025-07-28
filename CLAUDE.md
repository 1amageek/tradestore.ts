# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tradestore.ts is a Cloud Firestore model framework for TypeScript that provides e-commerce transaction management including orders, inventory, balance management, subscriptions, and payouts. It uses the @1amageek/ballcap-admin library for Firestore operations.

## Common Development Commands

```bash
# Build the TypeScript code
npm run build

# Run linting
npm run lint

# Run tests (uses Jest)
npm test

# Run a specific test file
npm test -- test/stockManager.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="StockManager"
```

## Architecture

### Core Managers

The library is organized around several manager classes that handle different aspects of e-commerce:

1. **StockManager** (`src/StockManager.ts`) - Manages inventory and stock operations
2. **OrderManager** (`src/OrderManager.ts`) - Handles order creation, checkout, and cancellation
3. **BalanceManager** (`src/BalanceManager.ts`) - Manages account balances and transactions
4. **PayoutManager** (`src/PayoutManager.ts`) - Handles payouts to accounts
5. **SubscriptionController** (`src/SubscriptionController.ts`) - Manages subscription lifecycle

### Key Protocols/Interfaces

The system uses protocol-based design with these core interfaces:

- **UserProtocol** - Represents tradeable users with orders and transactions
- **OrderProtocol/OrderItemProtocol** - Order and order item structures
- **SKUProtocol/StockProtocol** - Product SKUs and stock management
- **AccountProtocol** - Account information with balance and transactions
- **BalanceTransactionProtocol** - Transaction history for balance changes
- **TradeTransactionProtocol** - Trade transaction records

### Delegate Pattern

The system uses two key delegate interfaces that must be implemented:

- **PaymentDelegate** - Handles payment processing (authorize, charge, refund, transfer, payout)
- **TradeDelegate** - Handles item creation, reservation, and cancellation

### Sharding Strategy

The system uses sharding for scale with `ShardType` (a-z characters). Default shards use the first 10 characters (a-j). This is used in transactions and orders to distribute load.

## Testing Approach

Tests are located in the `test/` directory and use Jest with TypeScript. Test files follow the pattern `*.test.ts`. The tests use mock implementations of PaymentDelegate and TradeDelegate (see `test/stripePaymentDelegate.ts` and `test/tradeDelegate.ts`).

To ensure code quality, always run linting and tests before committing:
```bash
npm run lint
npm test
```