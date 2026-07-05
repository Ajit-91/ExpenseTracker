# MCP Tools

## Purpose

These tools allow the AI assistant to perform expense management operations.

---

# create_expense

## Description

Create a new expense.

## Input

```json
{
  "amount": 250,
  "category": "Food",
  "description": "Lunch",
  "date": "2026-06-29"
}
```

## Output

```json
{
  "success": true,
  "expenseId": "123"
}
```

---

# update_expense

## Description

Update an existing expense.

## Input

```json
{
  "expenseId": "123",
  "amount": 300
}
```

## Output

```json
{
  "success": true
}
```

---

# delete_expense

## Description

Delete an expense.

## Input

```json
{
  "expenseId": "123"
}
```

## Output

```json
{
  "success": true
}
```

---

# get_expenses

## Description

Retrieve expenses using filters.

## Input

```json
{
  "month": "2026-06"
}
```

## Output

```json
{
  "expenses": []
}
```

---

# get_monthly_summary

## Description

Return monthly spending summary.

## Input

```json
{
  "month": "2026-06"
}
```

## Output

```json
{
  "totalSpent": 12000,
  "topCategory": "Food"
}
```

---

# get_category_breakdown

## Description

Return category-wise spending.

## Input

```json
{
  "month": "2026-06"
}
```

## Output

```json
{
  "Food": 4500,
  "Travel": 3000,
  "Shopping": 2000
}
```

---

# Future MCP Tools

- detect_subscriptions
- create_budget
- get_budget_status
- scan_receipt
- generate_financial_report