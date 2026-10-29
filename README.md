# Petty Cash Module Analysis and BRD Input

## 1. Document purpose

This document analyses the petty cash capability implemented in the Fin-Workspace project and converts the observed behavior into structured input for a Business Requirements Document (BRD).

It is intentionally limited to petty cash and its directly related master data, cash inflows, cash accounts, monthly summaries, ledger, dashboard, and reports. Operational expense, cash-flow forecasting, client management, and unrelated finance modules are out of scope.

The document distinguishes:

- **Current implementation**: behavior evidenced in the source code.
- **BRD requirement recommendation**: a business requirement that should be confirmed or changed.
- **Gap / risk**: an area where the implementation does not yet fully support a controlled petty cash process.

## 2. Executive summary

The current module is a petty cash recording and reporting solution. It supports:

1. Recording petty cash expense and reimbursement transactions.
2. Recording cash added to the petty cash fund.
3. Combining inflows and expenses into a chronological ledger.
4. Maintaining a monthly opening balance, inflow total, expense total, closing balance, and transaction count.
5. Classifying expenses using active petty-cash components and optional sub-components.
6. Viewing a component-wise monthly expense summary.
7. Showing dashboard cards and charts for the selected month.
8. Editing and deleting petty cash transactions and cash inflows.
9. Recording audit events for transaction and inflow create, update, and delete operations.
10. Restricting most write operations through JWT authentication and displaying transaction actions based on UI permissions.

The current solution is not yet a complete controlled petty cash lifecycle. Important controls are either absent or incomplete: approval workflow, proper cash-account balance posting, receipt attachment, validation of cross-field rules, server-side authorization by action, reconciliation/closure, correction of prior-period summaries, reliable entry-number allocation under concurrency, and consistent authentication on all reporting endpoints.

## 3. Scope

### 3.1 In scope

- Petty cash expense transactions.
- Reimbursement transactions.
- Cash inflow / replenishment records.
- Petty cash accounts.
- Component and sub-component classification.
- Monthly balance summaries.
- Combined petty cash ledger.
- Component-wise expense reports.
- Dashboard cards and charts.
- User identity fields and audit trail as currently connected to the module.
- Permissions as exposed by the frontend and authentication middleware.

### 3.2 Out of scope

- Bank payments and sender accounts, except where they are referenced by the broader account model.
- Operational expense upload, allocation, invoice processing, and finalization.
- Cash-flow forecast and fixed-cost processing.
- General ledger integration beyond the petty cash records described here.
- Tax, invoice, or statutory accounting treatment.
- Payroll or employee reimbursement policy.

## 4. Stakeholders and proposed roles

The source code does not define a complete petty cash role matrix. The following roles are recommended for BRD confirmation:

| Role | Business responsibility | Recommended access |
|---|---|---|
| Petty Cash Custodian | Holds the cash, records inflows and expenses, maintains supporting documents | Create transactions and inflows; view ledger; submit reconciliation |
| Employee / Spender | Incurs or reports an expense | Submit expense or reimbursement request; view own submissions |
| Reviewer / Line Manager | Confirms business purpose and budget classification | Review and approve/reject submitted transactions |
| Finance Reviewer | Checks receipt, coding, amount, and period | Approve, return, correct, reconcile, and close period |
| Finance Administrator | Maintains components, sub-components, accounts, and policies | Configure masters; manage exceptions; rebuild summaries |
| System Administrator | Maintains users, roles, permissions, and technical settings | User and security administration |
| Auditor / Read-only User | Reviews history and evidence | Read-only access to transactions, reports, and audit trail |

**Current implementation observation:** the backend middleware verifies a JWT but does not itself enforce create, update, delete, approve, or report permissions. The frontend hides transaction edit/delete actions based on `permissions.write` and `permissions.delete`, but UI hiding is not a sufficient security control.

## 5. Current functional baseline

### 5.1 Navigation and user experience

The frontend exposes the following petty-cash-related pages:

| Page / route | Current purpose |
|---|---|
| `/transactions` | Petty cash transactions displayed through a ledger-style table |
| `/cash-inflow` | Cash added to the petty cash fund |
| `/` | Dashboard cards and component charts, including petty cash balances |
| `/pettycash-report` | Monthly component-wise expense report with PDF export |

The transaction page loads transactions, components, sub-components, the combined ledger, and the selected month summary. It provides search, date, month, and year filters. The current visible table focuses on date, component, amount, and permitted actions.

### 5.2 Expense and reimbursement transactions

The current transaction form supports:

- Transaction date.
- Transaction type: `EXPENSE` or `REIMBURSEMENT`.
- Active petty-cash component.
- Optional sub-component when available for the selected component.
- Description.
- Amount in INR.
- Bill available: yes or no.

The backend additionally stores:

- Generated entry number.
- Petty cash account.
- Spender user.
- Reimbursed-to user.
- Status.
- Entry/posting/audit user fields.
- Posting date.
- Optional idempotency key.
- Optimistic version field generated by the schema timestamps/version configuration.

**Current behavior:** new transactions are created as posted records by the controller. The controller sets `enteredBy`, `postedBy`, `postedAt`, `createdBy`, and `updatedBy` to the authenticated user. The frontend currently supplies a hard-coded petty cash account ID, a hard-coded spender user ID, and zero values for `balanceBefore` and `balanceAfter`; those fields are not part of the schema shown for the transaction model and therefore are not a reliable balance control.

### 5.3 Cash inflows

Cash inflow represents money added to the petty cash fund. The current form supports:

- Inflow date.
- Amount.
- Remarks.

The backend supports create, list, get-by-ID, update, and delete. Each successful mutation triggers a monthly summary rebuild and attempts to write an audit log.

### 5.4 Combined ledger

The ledger endpoint combines:

- Cash inflow rows, marked as `CASH_INFLOW`, with cash added.
- Petty cash rows, marked as `PETTY_CASH`, with expense.

Rows are sorted chronologically and a running balance is calculated from zero:

`running balance = previous running balance + cash added - expense`

The current transaction page filters the combined result down to `PETTY_CASH` rows, so cash inflow rows and the running balance are not currently visible in that table even though the endpoint calculates them.

### 5.5 Monthly summaries

For a month in `YYYY-MM` format, the summary stores:

- Opening balance.
- Total cash inflow.
- Total expense and reimbursement.
- Closing balance.
- Posted transaction count.

The current calculation is:

`closing balance = opening balance + total cash inflow - posted transaction amount`

The opening balance is taken from the previous month's stored closing balance, or zero when no previous summary exists. Summary rebuilds occur after transaction and cash-inflow create, update, and delete operations.

### 5.6 Dashboard and reports

The dashboard displays:

- Opening balance.
- Cash added.
- Total expense.
- Available cash / closing balance.
- Expense by component chart.
- Expense distribution chart.

The component expense report supports month/year selection and shows component code, component name, transaction count, total expense, and total reimbursement. It also provides a client-side PDF export with paginated tables and charts.

The component summary includes only petty cash records whose status is `POSTED`. The current ledger endpoint does not apply the same posted-status filter, so ledger and summary totals may diverge if draft or cancelled records are later introduced.

## 6. Proposed business process

The following process is recommended as the target BRD process. Steps marked **target** are not fully implemented today.

### 6.1 Fund setup and replenishment

1. Finance creates or activates a petty cash account.
2. The account is assigned to a custodian and, where applicable, a masked bank account.
3. A funding or replenishment request is created with date, amount, source, and remarks.
4. An authorized user approves the inflow (**target**).
5. The approved inflow is posted to the account balance.
6. The system updates the account balance, ledger, and monthly summary.
7. The system records who created, approved, and posted the inflow.

### 6.2 Expense recording

1. The spender or custodian enters the transaction date, type, category, amount, description, and bill status.
2. The system validates the selected component and sub-component relationship.
3. The system validates that the amount is positive and that the transaction date is allowed.
4. The user identifies the spender and, for reimbursement, the person receiving reimbursement.
5. Supporting evidence is uploaded or linked (**target**).
6. The transaction is saved as a draft or submitted for review (**target**).
7. A reviewer confirms business purpose, classification, amount, and evidence (**target**).
8. An authorized user posts the transaction.
9. The system updates the petty cash account balance and monthly summary.
10. The transaction becomes available in reports and the audit trail.

### 6.3 Reimbursement

1. The employee submits a reimbursement transaction.
2. The transaction captures the beneficiary (`reimbursedToUserId`) and supporting bill.
3. The reviewer verifies the expense.
4. Finance records the payment or reimbursement settlement (**target**).
5. The system prevents duplicate reimbursement and records settlement evidence (**target**).

### 6.4 Reconciliation and period close

1. The custodian counts physical cash.
2. The user enters the count date, expected system balance, physical balance, and variance (**target**).
3. Variances require explanation and reviewer sign-off (**target**).
4. Finance locks the period after review (**target**).
5. Locked-period records cannot be edited or deleted without an authorized adjustment process (**target**).
6. Reports and monthly summaries use the final approved dataset.

## 7. Functional requirements for the BRD

### 7.1 Account and master-data requirements

**FR-01. Petty cash account management**

- The system shall support multiple petty cash accounts.
- Each account shall have a unique immutable account code and a clear name.
- Each account shall identify its custodian/receiver and active status.
- The system shall maintain a system-calculated balance per account.
- An account shall not be deleted when it has historical transactions; it should be deactivated instead.

**FR-02. Component and sub-component classification**

- A component shall be eligible for petty cash only when marked active and petty-cash-enabled.
- A sub-component shall belong to the selected component.
- Inactive components/sub-components shall not be selectable for new transactions.
- The system should support component-level bill requirements and approval thresholds.

**FR-03. User and role administration**

- Users shall be selectable for spender and reimbursement beneficiary fields.
- Role permissions shall be enforced at the API as well as the UI.
- Access should support at least view, create, update, delete/void, approve, post, reconcile, close, and export actions.

### 7.2 Transaction requirements

**FR-04. Transaction creation**

- The system shall create a unique, human-readable entry number.
- The transaction shall record date, type, account, component, optional sub-component, description, amount, spender, bill status, creator, and status.
- Amount shall be greater than zero and use a defined currency/precision policy.
- The system shall validate the transaction date against the open accounting period.

**FR-05. Transaction status**

Recommended lifecycle:

`DRAFT -> SUBMITTED -> APPROVED -> POSTED`

Exception paths:

- `SUBMITTED -> RETURNED`
- `SUBMITTED -> REJECTED`
- `POSTED -> VOIDED` through a controlled reversal/adjustment process

The system shall preserve status history, actor, timestamp, and reason.

**FR-06. Reimbursement**

- Reimbursement must identify the beneficiary.
- Reimbursement must not be posted twice for the same source expense or claim.
- Settlement status and settlement date should be captured separately from approval.

**FR-07. Supporting documents**

- Users shall upload bills/receipts or provide a documented exception reason.
- File metadata shall include document type, upload user, upload time, and related transaction.
- Bill-required components shall not be posted without evidence or an approved exception.

**FR-08. Edit, delete, and correction**

- Draft transactions may be edited by authorized users.
- Posted transactions should not be hard-deleted; they should be reversed or voided with a reason.
- Prior-period corrections should trigger recalculation from the affected period forward.
- The system shall show before and after values in the audit history.

### 7.3 Cash inflow requirements

**FR-09. Inflow capture**

- The system shall record inflow date, account, amount, source, remarks, creator, approver, and posting status.
- Inflow amount shall be positive.
- Inflows shall be included in the account balance only after posting.
- The source of funds should be selectable or configurable rather than free text only.

### 7.4 Balance and reconciliation requirements

**FR-10. Balance calculation**

- The system shall calculate balance per petty cash account, not only globally.
- Opening balance shall be derived from the previous approved closing balance.
- Closing balance shall equal opening balance plus posted inflows minus posted expenses/reimbursements.
- Draft, rejected, cancelled, or voided records shall be excluded according to the final status policy.
- The system shall prevent or explicitly flag posting that would exceed an account's permitted negative balance policy.

**FR-11. Reconciliation**

- The system shall support periodic physical cash count.
- Variances shall be calculated and require a reason.
- Reconciliation should be approved before period close.

### 7.5 Reporting requirements

**FR-12. Ledger**

- The ledger shall show date, entry number, account, transaction type, component, description, inflow, expense, running balance, status, and actor.
- Users shall filter by account, date range, status, component, transaction type, and user.
- Ledger totals shall reconcile to the dashboard and monthly summary.

**FR-13. Component expense report**

- Users shall select month and year.
- The report shall show transaction count, expense total, reimbursement total, and net impact by component.
- The report shall support export to PDF and preferably spreadsheet/CSV.
- Exported reports shall state the generation time, reporting period, account scope, and filter criteria.

**FR-14. Management dashboard**

- The dashboard shall display opening balance, inflows, posted expenses, closing balance, transaction count, outstanding approvals, missing bills, and reconciliation variance.
- Charts shall use the same posted/approved population as the summary.

## 8. Data model and field dictionary

### 8.1 Petty cash transaction

| Field | Current type / rule | Business meaning | BRD consideration |
|---|---|---|---|
| `entryNo` | Required unique string | Human-readable transaction identifier | Generate atomically and retain across edits |
| `cashAccountId` | Required reference to `PettyCashAccount` | Account from which cash is paid | Must be selected/validated server-side |
| `transactionType` | `EXPENSE` or `REIMBURSEMENT` | Nature of cash use | Add policy-specific reimbursement and settlement fields |
| `transactionDate` | Required date | Date of expense or reimbursement | Define timezone and open-period rule |
| `componentId` | Required reference to `Component` | Primary expense classification | Validate active petty-cash eligibility |
| `subComponentId` | Optional reference | More detailed classification | Validate it belongs to `componentId` |
| `description` | Optional trimmed string | Business purpose/details | Define minimum quality and maximum length |
| `amount` | Required number, minimum 1 | Amount paid | Define currency, decimal precision, and rounding |
| `spentByUserId` | Required user reference | Person who incurred/spent the amount | Must be user-selectable rather than hard-coded |
| `reimbursedToUserId` | Optional user reference | Person receiving reimbursement | Required for reimbursement type |
| `billAvailable` | Boolean, default false | Whether supporting bill exists | Link to actual document and exception reason |
| `status` | `POSTED`, `DRAFT`, or `CANCELLED` | Current accounting state | Add approval/submission/reversal states or define current states fully |
| `idempotencyKey` | Optional sparse unique string | Prevents duplicate requests | Require for create operations where clients may retry |
| `enteredBy` | Required user reference | User entering the transaction | Keep separate from approver/poster |
| `postedBy` | Required user reference | User posting the transaction | Should only be set by posting action |
| `postedAt` | Optional date | Time of posting | Must be null until posting |
| `createdBy` / `updatedBy` | User references | Record ownership/history | Enforce server-side |
| `createdAt` / `updatedAt` | Timestamps | Record lifecycle timestamps | Use for audit and reporting |

### 8.2 Cash inflow

| Field | Current type / rule | Business meaning | BRD consideration |
|---|---|---|---|
| `inflowDate` | Required date | Date cash entered the fund | Define posting date and period rule |
| `amount` | Required number, minimum 1 | Cash added | Define currency/precision |
| `remarks` | String, default empty | Inflow explanation | Add source and reference number |
| `createdBy` | Current default `"Admin"` string | Creator label | Change to authenticated user reference |
| `createdAt` / `updatedAt` | Timestamps | Lifecycle tracking | Keep in audit trail |

### 8.3 Petty cash account

| Field | Current type / rule | Business meaning |
|---|---|---|
| `accountCode` | Required unique immutable uppercase string | Account identifier |
| `accountName` | Required string | Account display name |
| `receiverUserId` | Required user reference | Custodian/receiver |
| `receiverBankAccountMasked` | Optional string | Masked bank account |
| `currentBalance` | Decimal128, default 0 | Intended account balance |
| `lastCashInflowId` | Optional reference | Last inflow |
| `lastTransactionId` | Optional reference | Last expense transaction |
| `isActive` | Boolean, default true | Account availability |
| `createdBy` / `updatedBy` | User references | Audit ownership |

**Implementation observation:** the transaction and inflow controllers rebuild aggregate monthly summaries but do not visibly update `PettyCashAccount.currentBalance`, `lastCashInflowId`, or `lastTransactionId`. The BRD should make the source of truth explicit.

### 8.4 Monthly balance summary

| Field | Meaning |
|---|---|
| `month` | Unique `YYYY-MM` period |
| `openingBalance` | Previous period closing balance |
| `totalCashInflow` | Sum of inflows in the period |
| `totalExpenseAndReimbursement` | Sum of posted petty cash amounts |
| `closingBalance` | Opening plus inflow minus expense |
| `transactionCount` | Count of posted petty cash transactions |

## 9. API inventory

Base URL is mounted by the backend under `/api`.

| Method | Endpoint | Auth currently | Purpose |
|---|---|---|---|
| POST | `/transactionRouter/createTransaction` | JWT | Create petty cash transaction |
| GET | `/transactionRouter/getAllTransactions` | No middleware shown | List all transactions |
| PATCH | `/transactionRouter/updateTransaction/:id` | JWT | Update transaction |
| DELETE | `/transactionRouter/deleteTransaction/:id` | JWT | Delete transaction |
| POST | `/cashInflowRouter/createCashInflow` | JWT | Create inflow |
| GET | `/cashInflowRouter/getAllCashInflows` | JWT | List inflows |
| GET | `/cashInflowRouter/getCashInflow/:id` | JWT | Get inflow |
| PATCH | `/cashInflowRouter/updateCashInflow/:id` | JWT | Update inflow |
| DELETE | `/cashInflowRouter/deleteCashInflow/:id` | JWT | Delete inflow |
| GET | `/reportRouter/componentExpenseSummary` | No middleware shown | Component summary by month/year |
| GET | `/reportRouter/pettyCashLedger` | No middleware shown | Combined inflow/expense ledger |
| GET | `/summaryRouter/monthlySummary` | JWT | List monthly summaries |
| GET | `/summaryRouter/monthlySummary/:month` | JWT | Get one monthly summary |
| GET | `/summaryRouter/rebuild-all-summaries` | No middleware shown | Rebuild all summaries |
| GET | `/componentRouter/getActivePettyCashComponents` | JWT | List active petty cash components |
| GET | `/subComponentRouter/getSubComponentByComponent/:componentId` | JWT | List sub-components for a component |

### API design risks to resolve

1. List transactions and both report endpoints are shown without authentication middleware.
2. The rebuild-all endpoint is a GET and is shown without authentication or administrative authorization.
3. No route-level permission middleware is visible for write, delete, posting, or administration actions.
4. Report endpoints do not expose account, status, date-range, or user filters.
5. Error responses and status codes are not fully standardized across controllers.
6. The update endpoint accepts the request body broadly; immutable/system-controlled fields should be allow-listed.
7. The create transaction controller accepts client-supplied posting and balance-related fields without a complete server-side posting calculation.

## 10. Validation and control requirements

### 10.1 Current validation

- Mongoose requires transaction entry number, account, type, date, component, amount, spender, entered-by, and posted-by.
- Transaction amount and inflow amount must be at least 1.
- Transaction type and status use enumerations.
- Component and sub-component existence is checked during transaction creation.
- Components have format, uniqueness, length, active-status, and petty-cash flags.
- Authentication middleware validates a JWT for routes where it is attached.

### 10.2 Missing or recommended validation

- Ensure the component is active and `isPettyCash: true` during transaction creation, not only in the UI.
- Ensure the sub-component belongs to the selected component and is active.
- Require `reimbursedToUserId` for reimbursement transactions.
- Do not allow arbitrary `enteredBy`, `postedBy`, `postedAt`, `createdBy`, or `updatedBy` from the client.
- Validate the petty cash account exists and is active.
- Validate dates and prevent invalid future or closed-period postings according to policy.
- Validate duplicate submissions using `idempotencyKey`.
- Validate that the selected bill status is consistent with component policy.
- Add maximum amount, approval threshold, and negative-balance rules.
- Use a transaction-safe balance update when multiple users post at the same time.

## 11. Audit, security, and compliance

### 11.1 Current audit behavior

Create, update, and delete operations attempt to write an audit log for petty cash transactions and cash inflows. Transaction updates capture request-body field names and before/after snapshots. Delete events capture the deleted record as before data.

Audit-log failures for transaction creation and inflow mutations are logged but do not fail the business operation. The transaction update/delete path calls the audit service without the same local protection.

### 11.2 BRD controls

- Every mutation shall record actor, timestamp, action, entity, source, reason, and before/after values.
- Audit data shall be append-only for ordinary users.
- Hard deletion should be prohibited for posted financial records.
- Access to reports and ledger data shall require authentication and authorization.
- Sensitive user and bank details shall be masked according to policy.
- Exports shall be permission-controlled and logged.
- Failed audit persistence shall produce an explicit operational alert; the treatment of the business transaction must be defined.
- All monetary calculations shall be deterministic and use a defined precision strategy.

## 12. Reporting and reconciliation rules

The target reporting rule should be:

`closing balance = opening balance + posted cash inflows - posted expenses - posted reimbursements`

For each reporting period, the system should be able to reconcile:

1. Opening balance to the prior approved closing balance.
2. Inflow total to posted inflow records.
3. Expense total to posted transaction records.
4. Closing balance to the account's posted balance.
5. Physical cash to system closing balance.
6. Component report total to ledger expense total.

Any mismatch should be visible as an exception rather than hidden by a fallback calculation.

## 13. Non-functional requirements

| Area | Requirement |
|---|---|
| Availability | Petty cash entry and inquiry should be available during business operating hours with defined recovery targets |
| Performance | Typical list, filter, and summary requests should return within the agreed service target for the expected transaction volume |
| Consistency | Balance, summary, ledger, and report calculations must use the same posting/status rules |
| Concurrency | Simultaneous creates and balance updates must not generate duplicate entry numbers or lost balance updates |
| Security | JWT authentication and server-side authorization must protect all financial data and actions |
| Auditability | Financial changes must be traceable and non-repudiable |
| Usability | Forms should provide clear validation, required-field indicators, and actionable error messages |
| Data retention | Retention period for transactions, receipts, audit logs, and reports must be defined by finance policy |
| Export | Exported files must preserve period, filters, totals, and generation metadata |
| Localization | Amounts should follow the configured currency and locale; dates should have an explicit timezone policy |
| Recovery | Summary rebuilds and balance correction procedures must be documented and safe to rerun |

## 14. Acceptance criteria

### 14.1 Core recording

- An authorized user can create an expense with valid date, type, account, component, amount, spender, and bill status.
- The system rejects an invalid account, inactive petty-cash component, invalid sub-component relationship, zero/negative amount, or missing required field.
- A reimbursement requires a beneficiary and cannot be duplicated.
- The entry number is unique even when two users submit at the same time.

### 14.2 Posting and balances

- Only posted records affect balances, summaries, and management reports.
- A posted inflow increases the correct account balance.
- A posted expense decreases the correct account balance.
- A prior-period correction recalculates all affected subsequent period balances.
- Account balance, ledger balance, monthly closing balance, and dashboard available cash agree.

### 14.3 Workflow and control

- Draft, submitted, approved, rejected/returned, posted, and voided states have defined transitions and permissions.
- Posted records cannot be hard-deleted by ordinary users.
- A user without delete permission cannot delete a transaction through the API, even if they bypass the UI.
- Closed periods cannot be changed without an authorized adjustment.

### 14.4 Evidence and audit

- A bill-required transaction cannot be posted without a receipt or approved exception.
- Every create, update, approve, post, void, delete/adjust, and export event has an audit entry.
- Audit entries show actor, timestamp, action, record, and changed values.

### 14.5 Reports

- The component report returns the same posted total as the ledger for the same period and account scope.
- The dashboard cards use the same summary population as the report.
- PDF export contains reporting period, filters, row totals, grand total, and generation metadata.
- Unauthorized users cannot retrieve ledger, transaction, or report data.

## 15. Prioritized implementation gaps

| Priority | Gap | Business impact | Recommended resolution |
|---|---|---|---|
| P0 | Report/list routes and rebuild-all route are shown without authentication | Financial data exposure or unauthorized destructive recalculation | Require authentication and role/permission checks |
| P0 | Backend does not visibly enforce action permissions | Users may bypass UI restrictions | Add server-side authorization middleware |
| P0 | Posted records can be hard-deleted | Loss of financial history and weak auditability | Replace deletion with void/reversal; restrict hard delete to controlled administration |
| P0 | Account balance is not visibly updated from transactions/inflows | Account balance can diverge from ledger and summaries | Make one server-side posting service the source of truth |
| P1 | Client supplies hard-coded account and spender IDs | Transactions may be assigned to the wrong account/person | Load active account/users and validate server-side |
| P1 | Entry-number generation is not visibly concurrency-safe | Duplicate or skipped identifiers under concurrent requests | Use a database counter/atomic sequence |
| P1 | Summary rebuild uses previous stored summary and does not visibly cascade after prior-period edits | Later opening balances can become stale | Rebuild affected month and all later months in order |
| P1 | Ledger does not filter to posted records while summary does | Reports and ledger may disagree | Centralize status filtering |
| P1 | No receipt attachment or exception workflow | Weak expense evidence and audit readiness | Add document storage and bill policy |
| P1 | No approval, settlement, or reconciliation workflow | No separation of duties or physical cash control | Implement workflow and period closure |
| P2 | Inflow creator defaults to `"Admin"` | User accountability is inaccurate | Store authenticated user reference |
| P2 | Broad update payload can change system-controlled fields | Data integrity risk | Allow-list editable fields |
| P2 | Report filtering is limited to month/year | Limited operational investigation | Add account, status, component, date range, and user filters |
| P2 | UI date/year options are hard-coded | Future periods require code changes | Generate from policy/current date or configuration |
| P2 | Error and audit failure handling is inconsistent | Operational failures may be hidden | Standardize errors and alert on audit persistence failure |

## 16. Recommended BRD decisions to confirm

1. Is petty cash maintained as one global fund or multiple independent petty cash accounts?
2. Who may create, approve, post, edit, void, reconcile, and close petty cash records?
3. Are expenses entered directly as posted, or must every expense pass through approval?
4. Is reimbursement a separate payment event, or only a transaction classification?
5. What is the receipt threshold and what is the approved exception process?
6. Are future-dated expenses allowed?
7. Can a transaction be edited after posting? If yes, which fields and under what approval?
8. Should negative balances be prohibited, allowed temporarily, or require escalation?
9. What is the accounting period close date and who can reopen a period?
10. Is the current `currentBalance` on the petty cash account the authoritative balance?
11. What are the required currencies, decimal precision, timezone, and fiscal year rules?
12. What reports are required beyond component summary, ledger, dashboard, and PDF?
13. What retention period applies to transactions, receipts, audit logs, and exports?
14. Should cash inflows require a source/reference number and approval?
15. What integrations are required with the general ledger, bank, payroll, or employee master?

## 17. Suggested BRD structure using this analysis

The final BRD can use this document as the discovery baseline and be organized as:

1. Business objective and problem statement.
2. Scope and exclusions.
3. Stakeholders and role matrix.
4. Current-state process.
5. Target-state process.
6. Functional requirements.
7. Business rules and validations.
8. Data requirements.
9. Workflow and approval matrix.
10. Reporting and reconciliation requirements.
11. Security, audit, and compliance.
12. Non-functional requirements.
13. Integrations and dependencies.
14. Acceptance criteria.
15. Assumptions, decisions, risks, and open questions.
16. Release priorities and implementation phases.

## 18. Source surfaces reviewed

The analysis was based on the petty-cash-specific implementation in:

- Backend petty cash controllers, models, routes, monthly summary service, authentication middleware, petty cash account model, and component model.
- Frontend petty cash transaction page, cash inflow page, dashboard, reports page, data context, transaction filters, ledger table, and petty cash data definitions.

The findings describe the source behavior observed at the time of analysis. Any business policy not represented in those surfaces is marked as a recommendation or open decision rather than treated as an implemented feature.
