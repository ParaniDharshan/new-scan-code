# FLC360 Schema Review and Reuse Assessment

## 1. Purpose and scope

This document reviews:

1. The supplied FLC module model snapshot under `src/modules/fully-loaded-cost/models`.
2. The supplied wider application model snapshot under `models`.
3. The models currently defined in this workspace's `server/src/server.js` and the documented FLC360 workflow.

The two supplied model listings are pasted snapshots, not model files currently present in this workspace. The active workspace has a smaller set of inline Mongoose schemas in `server/src/server.js`. Keep that distinction in mind when planning a migration or reuse.

This is a schema and data-flow assessment only. It does not implement models or change application behavior.

## 2. Executive conclusion

The proposed FLC module provides a useful starting set for employee-specific direct costs and fixed-asset depreciation. It does not yet describe the complete FLC calculation lifecycle: indirect cost pools, workbook import and mapping, working-hour history, allocation rules, and immutable calculation results are not fully represented.

The wider application schema already contains useful foundations:

- Company, user, role, and permission concepts.
- Component and subcomponent masters with flags identifying records relevant to Fully Loaded Cost.
- Fixed-asset category and asset-type masters.
- Operational-expense report structures that demonstrate source-row tracking, mapping status, unmatched-row resolution, and report totals.

Reuse these concepts rather than creating duplicate master data. Do not use the operational-expense report as the FLC calculation itself: it has a different business purpose and does not model employee-level allocation or FLC output.

Before production use, establish one canonical company, department, team, employee, fixed-asset catalog, and component master. Then add the FLC-specific records needed to import costs, apply approved allocation rules, and preserve each calculated report version.

## 3. Supplied FLC models: what each group represents

The FLC snapshot contains 20 model files. They form these related areas:

| Area | Models | Role |
|---|---|---|
| Organization | `DirectCostDepartment`, `DirectCostTeam`, `DirectCostEmployee` | Company-scoped FLC department, team, and employee records. Employees reference department and optionally team. |
| Employee direct-cost inputs | `EmployeeSalary`, `HolidayBonus`, `CertificationReimbursement` | Effective-dated salary history and year-specific bonus/certification amounts for an employee. |
| Insurance | `InsuranceCategory`, `InsuranceItem`, `InsurancePremium` | Insurance category and policy details, followed by annual premium history. Policies may be employee-specific or shared because the employee reference is optional. |
| Resources | `ResourceCategory`, `ResourceItem`, `ResourceAssignment` | Resource catalog and dated employee assignments. |
| Software | `SoftwareCategory`, `SoftwareItem` | Software category and license/subscription details; an item can optionally reference an employee. |
| Fixed assets | `DepreciationConfiguration`, `FixedAssetRegister`, `FixedAssetAssignment`, `FixedAssetValue`, `FixedAssetDepreciation` | Depreciation settings, acquired asset records, assignment history, valuation history, and calculated depreciation by period. |
| FLC report | `FullyLoadedCostReport` | A month-specific report with imported rows and/or structured sections, totals, approval state, and audit users. |

### 3.1 Organization and employee costs

The FLC department, team, and employee schemas give the cost records employee and organizational identities to reference. Salary, holiday bonus, and professional-certification reimbursement are separate records, which supports audit history and effective-year reporting better than storing all amounts directly on the employee.

Insurance, resources, and software are split into catalogs and employee-linked records. This is a useful normalized structure: categories describe types of costs, items describe policies/assets/licenses, and premium or assignment records describe the financial or assignment history.

These are input records, not a complete monthly FLC ledger. The schemas need clearly defined period semantics and rules for turning a premium, subscription, reimbursement, or salary into a cost for a specific report month or financial year.

### 3.2 Fixed assets and depreciation

The asset register represents acquired assets; the valuation records allow values to change over time; assignment history records who or which department used an asset; and depreciation records store opening WDV, depreciation, accumulated depreciation, and closing WDV for a period.

This separation is a good foundation for traceability. The depreciation calculation should also record the exact configuration and inputs used, and a uniqueness rule should prevent duplicate asset-period calculations. The current snapshot does not show those safeguards.

### 3.3 FLC report

`FullyLoadedCostReport` can store original spreadsheet-like rows (`headers`, `rows`, row numbers), structured sections, a total, and draft/approved status. This can be useful for retaining a report-shaped view.

As written, it is not a robust calculation-run record:

- It has a unique `reportMonth`, so it permits only one report per month across the collection. It has no company or version in that unique key.
- It has no explicit financial-year, calculation-version, input-batch, or allocation-rule references.
- Generic `Mixed` row data is flexible but weakly validated and difficult to query reliably.
- Structured rows contain only a name, amount, and estimated flag; they do not capture employee-level results, allocation basis, source references, or formula inputs.
- A single `sourceFileName` does not represent multiple Direct Cost, Indirect Cost, and Fixed Asset input workbooks.

Use it, at most, as a report presentation or imported workbook snapshot after adding suitable ownership and version identity. Do not treat it alone as the auditable source of truth for FLC calculations.

## 4. Wider application schema: what is reusable

| Existing area | Reuse assessment for FLC |
|---|---|
| `CompanyMaster` | Reuse as the company identity if this is the same application and database. FLC records should reference the same company key and consistently name the field (`companyId` or the established application convention). |
| `User`, `Role`, `Permission` | Reuse for created/updated/approved-by references if these are the active authentication models. The FLC snapshot's audit fields already point to `User`, but references must target the actual shared model. |
| `Component` and `SubComponent` | Strong candidates for the shared cost taxonomy. Their `isFullyLoadedCost` flags, codes, names, category references, bill requirements, active state, and display order can identify and order FLC-relevant components. Add FLC-specific allocation configuration separately if these shared masters serve multiple modules. |
| `FixedAssetCategoryMaster` and `FixedAssetMaster` | Reuse as category/type catalogs. The master has category, description, aliases, and active state, which can help map uploaded asset descriptions. These are not individual purchased assets and do not replace the FLC register, valuation, assignment, or depreciation-period records. |
| Operational-expense reports and rows | Reuse the design pattern for source imports: preserve source amounts, mapped component IDs, match status, source ledger information, manual edits, display order, unmatched rows, resolution reasons, and report status. This is especially relevant to workbook/Tally reconciliation. |
| `OperationalExpenseTotals` and fixed-cost sections | They demonstrate storing cost totals and supporting detail, but their existing totals and allocations belong to operational-expense reporting. Do not assume their definitions or amounts equal FLC direct, variable, fixed, or semi-variable costs. |
| Currency and financial-category masters | Reuse where they are canonical and applicable. Define one currency and financial-period convention for FLC rather than silently mixing amount formats or month/year keys. |
| Petty-cash, cashflow, invoice, and client-allocation schemas | Generally not FLC data models. They may offer implementation patterns, but their transaction meaning and allocation targets differ. |

The shared `Component`/`SubComponent` masters are particularly valuable for consistent names and import mapping. Their module flags alone do not define FLC calculation behavior: the FLC process still needs to know whether a component is employee-direct, shared variable, fixed depreciation, administrative semi-variable, and how it is allocated.

## 5. Important gaps and risks to resolve

### 5.1 Duplicate masters and inconsistent relationships

The FLC snapshot introduces its own `DirectCostDepartment`, `DirectCostTeam`, and `DirectCostEmployee` while the wider application already has department, team, and employee concepts. Its fixed-asset register and depreciation records also overlap in purpose (but not lifecycle) with the wider application's fixed-asset category and asset-type masters. The supplied wider application snapshot does not show backend resource or software catalog models; those FLC catalogs appear to be new domain masters based on the provided evidence.

Maintaining parallel versions risks the same employee, department, or asset having different IDs and names in different modules. Choose one canonical master for each shared concept and reference it from FLC records. Only create a separate FLC entity if it has a genuinely different lifecycle and an explicit link to the canonical record. Resource and software catalog models can remain FLC-specific unless another module needs to own those catalogs.

The FLC department has no `departmentType`, even though the business calculation distinguishes Revenue, Administrative, and Reserve. That classification must come from the canonical Department record or be added to the single authoritative department model. Do not copy it inconsistently across FLC employee rows.

The FLC employee has both a department and a team reference, but the FLC team model does not itself reference a department. The wider application team relationship does. Prefer the existing department-to-team relationship and validate that an employee's selected team belongs to their department.

### 5.2 Company scoping and uniqueness

Several FLC records carry a company reference, but their code indexes are globally unique (for example employee, department, team, and asset codes). If codes are only required to be unique within a company, use company-scoped uniqueness conceptually: company plus code. Also apply company filtering consistently to every read and write.

The FLC snapshot uses both `companyId` and `compId` for a company reference. Standardize the name and target model. References to company-owned category/configuration records should also be checked for matching company ownership.

### 5.3 Period, history, and money semantics

The models mix `effectiveYear`, `financialYear`, `reportMonth` (`YYYY-MM`), and date ranges. Define which costs are annual, monthly, or transaction-dated, and how they are prorated into a report period. A financial-year report and a monthly report are not interchangeable.

`EmployeeSalary` stores both annual and monthly salary, which can disagree. Choose a canonical amount and pay frequency, or define validation that guarantees the two values agree. Effective date ranges should not overlap for the same employee unless an explicit rule permits it.

All amounts use JavaScript/Mongoose `Number` in the supplied FLC models. For financial calculations, define currency, decimal precision, rounding stage, and whether values are stored as decimal amounts or integer minor units. Keep calculations from repeatedly rounding intermediate allocations.

### 5.4 Fixed-asset rules

The depreciation configuration contains both percentage fields and useful-life/residual-value fields, but the model does not define permitted methods, valid ranges, how those settings are selected for an asset, or how overlapping effective configurations are prevented. It references a company rather than a fixed-asset category, while the wider application has an asset-category master.

Clarify whether an asset's register value, value history, or purchase cost is the depreciation basis. Assignment validation should ensure exactly the intended employee or department is set for the selected `assignedToType`. Depreciation records should be unique for the appropriate asset and financial period and should preserve the configuration used at calculation time.

### 5.5 Missing FLC calculation and import lifecycle

The supplied FLC model set has useful cost inputs, but does not show dedicated structures for:

1. Import batches for the Direct Cost, Indirect Cost, and Fixed Asset workbooks, each with period, company, file metadata, uploader, validation state, and source identity.
2. Row-level mapping/reconciliation for FLC inputs, including unresolved rows and the reason a source line was mapped, excluded, or manually added.
3. Shared indirect/variable cost pools and their allocation basis for a report period.
4. A durable FLC calculation run/version that captures the exact inputs, working hours, allocation ratio, depreciation results, assumptions, and employee-level output used for approval.

The current workspace does have simple inline `EmployeeWorkingHours` and audit schemas, and a simpler fixed-asset import model. Those are useful starting points, but the supplied FLC snapshot does not include working hours. Ensure there is only one canonical employee-hours store keyed by employee and reporting period; avoid storing a detached employee code if a stable employee reference is available.

## 6. Schema concepts to pin before implementation

These are business/schema decisions that should be confirmed before treating the model set as final:

1. **Canonical ownership:** Is the FLC module in the same database and tenant boundary as `CompanyMaster`, `Department`, `Team`, `Employee`, and `User`? Which exact models are authoritative?
2. **Department classification:** Is Revenue/Administrative/Reserve a property of the existing Department master? Are there other department types?
3. **Calculation period:** Are users calculating by month, financial year, or both? How do annual salary, annual insurance, subscription frequency, and asset depreciation become a monthly amount?
4. **Allocation policy:** Which shared costs are allocated to Revenue, Administrative, and Reserve employees, and what is each allocation basis? Confirm the exact annual/monthly treatment and rounding for semi-variable administrative cost.
5. **Calculation versioning:** Can a company create multiple draft or approved calculations for the same month/year? If yes, report uniqueness must include company and version/run identity, not only month.
6. **Import retention:** Must original workbooks be stored, or are file name/checksum plus normalized rows sufficient? How long must source files and row-level provenance be retained?
7. **Fixed-asset accounting:** Which depreciation method and effective configuration apply to each asset, and can historical calculations be rerun or only superseded by a new version?

## 7. Recommended conceptual data flow

1. Resolve employees, departments, teams, components, subcomponents, and asset categories against the shared masters.
2. Store each workbook as a period- and company-scoped import batch. Retain row-level source information and explicit mapping/reconciliation status.
3. Resolve direct employee costs, shared indirect cost pools, and fixed-asset depreciation to the appropriate FLC component and allocation method.
4. Use the existing employee-hours concept, made period-aware and tied to the canonical employee record.
5. Create a versioned FLC calculation snapshot that records its input references and calculation assumptions, then stores employee-level direct, indirect, fixed, semi-variable, per-hour, and per-month results.
6. Approve the calculation snapshot. Reports and CSV/Excel exports should be generated from that approved snapshot so historical outputs do not silently change when a master or source record is edited later.

## 8. Final recommendation

### Reuse

- The wider application's company and user identity models, if they are the active shared models.
- Component and subcomponent masters for FLC cost names, codes, ordering, and module eligibility.
- Fixed-asset category and asset-type masters for classification and mapping.
- Operational-expense import/reconciliation patterns for source rows, matching, manual resolution, and audit.
- The current workspace's working-hours and fixed-asset import concepts, after aligning them with canonical employee, company, and period keys.

### Keep FLC-specific

- Salary, bonus, certification, insurance premium, resource/software assignment, asset register/value/assignment, and depreciation-period concepts are FLC-specific inputs or histories. They can be used after their ownership, period, and validation rules are tightened.
- FLC allocation rules, cost pools, and calculation snapshots must express FLC business semantics; operational-expense allocation totals are not a substitute.

### Add or finalize before production

Prioritize a period/company-scoped cost import and reconciliation model, an indirect-cost-pool/allocation-rule model, and a versioned FLC calculation snapshot with employee-level results. Reconcile duplicated organization and asset masters before creating production records. Tighten compound uniqueness, effective-date validation, currency/rounding, and depreciation period integrity.

In short: the existing application provides valuable identity, taxonomy, asset-catalog, and reconciliation building blocks. The FLC models provide a useful input foundation. Neither set alone currently defines a complete, traceable, versioned FLC calculation pipeline.

## 9. Comparison with the application currently in this workspace

The current backend is a prototype with inline Mongoose schemas in `server/src/server.js`. It is not the same model tree as the supplied wider-application snapshot.

| Current application area | What exists now | FLC implication |
|---|---|---|
| Company and identity | `User` exists, but the current workspace does not define `CompanyMaster` or company ownership on its department, employee, or asset records. | Do not assume the pasted `CompanyMaster` is active in this app. If multiple companies will use this deployment, add company ownership to the canonical records and scope indexes/queries by company. |
| Departments, teams, employees | Basic `Department`, `Team`, and `Employee` schemas exist. `Department.departmentType` already supports Revenue, Administrative, and Reserve. Team and employee records reference departments; employees also reference teams. | Reuse these as the starting organizational models. Do not add a separate FLC department/employee model unless it links to these canonical records. Add validation that an employee's team belongs to their department. |
| Working hours | `EmployeeWorkingHours` stores an employee code, financial year, and hours (0–744), with a unique employee/year index. An audit schema and API routes exist, but the client working-hours screen currently keeps its values in application state and does not call those routes. | A second working-hours model is not needed for the current yearly input. Connect the client to the existing persistence API. If monthly hours are required for monthly reports, extend the period key intentionally; also consider replacing the detached employee code with a reference to the canonical Employee. |
| Fixed assets | `AssetCategory`, `DepreciationConfiguration`, and `FixedAsset` exist. `FixedAsset` stores asset code, name, category text, purchase cost/date, useful life, residual value, and status. | This is enough for the current basic import and straight-line depreciation prototype. Normalize category references and extend the existing asset model if needed; do not create a second unlinked `FixedAsset` collection. |
| Asset upload and depreciation | The fixed-asset upload validates a workbook and upserts records by asset code. The depreciation endpoint currently calculates straight-line annual depreciation from purchase cost, residual value, and useful life, grouped by the category text. It does not use `DepreciationConfiguration`. | Pick one authoritative depreciation source. If the configuration model is intended to drive calculations, connect it explicitly and preserve the applied configuration with each calculation. The current import does not preserve an import batch or row-level history. |
| Cost file upload | The Upload Center holds Direct Cost and Indirect Cost selections in client state. Only the Fixed Asset workbook is sent to the backend for persistence. | The app needs persisted Direct and Indirect import/mapping data before uploaded inputs can reliably drive a calculation. Selecting a file is not equivalent to importing its rows. |
| FLC calculations and reports | Data Analysis still uses sample employee direct costs and sample variable pools, with fixed-asset depreciation fetched from the API. `/api/flc/calculate` calculates a ratio; `/api/flc/versions` returns sample versions. CSV reports are assembled in the browser. | There is no persisted, versioned FLC calculation result in the current backend. Add a durable run/snapshot before treating the report archive or export as historical/auditable results. |

### Application-level decision

For the present prototype, **do not add duplicate Department, Team, Employee, Working Hours, or Fixed Asset models**. Reuse and strengthen the current ones. The material additions needed for an end-to-end FLC workflow are:

1. **Cost import batches and normalized source rows** for Direct Cost, Indirect Cost, and Fixed Asset input, including company/period, source file and worksheet, upload status, row number, mapping status, and resolution history. The existing operational-expense unmatched-row design is a useful pattern.
2. **Indirect cost pools and allocation configuration** for shared variable costs and any other non-employee-specific costs. Link the pool to the shared component/subcomponent taxonomy where available, and store the period and allocation basis used.
3. **Versioned FLC calculation runs/results** containing the exact input references, working hours, allocation ratio, depreciation assumptions, per-employee cost breakdown, final per-hour/month results, status, and approval audit. A report month alone is not a sufficient version key.

An FLC-specific component-to-allocation-rule mapping may also be required. The wider application's `isFullyLoadedCost` flags identify relevant master records, but do not by themselves say whether a cost is direct, variable, fixed depreciation, or administrative semi-variable, or how it should be allocated.

Other additions are conditional:

- Add or standardize company ownership only if this app is intended to be multi-company. The pasted `CompanyMaster` is not present in the current backend.
- Extend the current asset records with assignment history, valuation history, and per-period depreciation records only if FLC needs those lifecycles, rather than only the current simple straight-line calculation.
- Add monthly working-hour records only if monthly employee hours differ and are part of the reporting rule. Otherwise the existing employee/year record can remain the input source.

## 10. Review of the sample-folder schema diagrams

The sample folder contains [DC final.png](./sample/DC%20final.png) and [FA final.png](./sample/FA%20final.png). These are ERD images rather than executable schemas; the diagrams do not show every constraint or validation rule.

### 10.1 Direct Cost ERD — `DC final.png`

The diagram shows a Company owning Departments, Teams, Employees, Resource Categories/Items, Software Categories/Items, and Insurance Categories/Items. Employee-linked cost history includes salary, professional-certification reimbursement, holiday bonus, insurance premium, resource assignment, and software/insurance records. This is a useful coverage map for employee-specific direct costs and broadly matches the FLC snapshot.

Suggestions:

- The diagram's Department has no Revenue/Administrative/Reserve type. The current application's Department already has this required classification; retain that field in the authoritative Department model.
- The diagram links both Team and Employee to Department. Keep this relationship only with a validation that an employee's team is in that same department.
- Company, Department, Team, and Employee IDs are shown as integers, while the current Mongoose application and supplied FLC snapshots use ObjectIds. Select one identifier type for the actual MongoDB implementation and use it consistently for every reference. Do not treat an integer-looking diagram key as interchangeable with a Mongoose ObjectId.
- Scope business-code uniqueness by company when codes may repeat between companies. The diagram does not communicate unique indexes or compound indexes.
- Several item records are optionally linked to an employee. Define what happens when an item is not employee-specific: it should be assigned to a department/shared cost pool, not silently omitted or counted as employee direct cost.
- Add explicit effective periods and currency/amount conventions where the diagram currently only shows a year or amount. Specify how recurring policies, subscriptions, reimbursements, and salary changes are included in a selected monthly or annual FLC period.
- This ERD does not show the Indirect Cost pool/import model, workbook reconciliation, or an FLC calculation run/result. It should not be read as the complete FLC schema.

### 10.2 Fixed Asset ERD — `FA final.png`

The diagram shows `FixedAssetCategory` → `FixedAssetMaster` → `FixedAssetValue`, with a `DepreciationConfiguration` used by `FixedAssetDepreciation`. The depreciation record contains financial year, opening WDV, depreciation amount, accumulated depreciation, closing WDV, and calculation time. This is a useful outline for asset classification and depreciation history.

Suggestions:

- Keep the distinction between an **asset master/type** and an **asset register/instance** clear. A master such as “Laptop” can describe a type; an individual purchased laptop needs its own asset code, purchase date/cost, residual value, status, and possibly serial number. If `FixedAssetValue.assetId` points only to the type master, identical physical assets cannot be depreciated or disposed of independently.
- The current app already has an individual `FixedAsset` record with asset code and purchase details. Reuse that as the register starting point, or explicitly migrate/split it into a type master plus register; do not keep both without a stable relationship and migration plan.
- Link depreciation configuration to the relevant company and asset category/type, with effective dates and validated method/rate/life/residual rules. The image does not show enough ownership/category linkage to determine which configuration applies to an asset.
- Add effective date range and currency to valuation history. A value alone does not explain when it applies or which currency it uses.
- Store depreciation period start/end and the applied configuration/input snapshot. Enforce one valid result per asset and period/version, and define how recalculation or corrections are represented.
- The current backend calculates depreciation directly from each asset's purchase fields and does not consult its configuration collection. The diagram and implementation therefore need one agreed source of truth for useful life, residual value, and depreciation method.
- This diagram covers fixed assets only. It does not capture Direct/Indirect workbook import batches, cost mapping, administrative allocation, or final FLC employee results.

## 11. Final answer: is another schema needed?

**Yes, for a complete and persistent FLC workflow—but not for every area.**

### Add

- A period/company-scoped import batch and row-level source/mapping model (or an equivalent extension that preserves all three workbook sources and their reconciliation).
- An indirect/shared-cost pool model with explicit component mapping and allocation basis.
- A versioned FLC calculation snapshot and employee-level result data, including approval state and source references.

### Reuse or extend instead of duplicating

- Current `Department`, `Team`, and `Employee`; ensure department type and team consistency remain available.
- Current `EmployeeWorkingHours`; tie it to the canonical employee and make the period monthly only if the business rule requires it.
- Current `FixedAsset`/`AssetCategory` records for the basic workflow; extend them to support the agreed asset lifecycle and depreciation history.
- Shared `Component`/`SubComponent` if these are actually present in the deployed application. They appear in the supplied wider-app snapshot but not in the current workspace backend.

### Do not add yet

- A second set of department, team, employee, or working-hours collections.
- A second fixed-asset inventory disconnected from the current `FixedAsset` collection.
- A duplicate cost-component taxonomy if the shared component masters can be used and extended with an FLC-specific allocation mapping.

The sample ERDs are good starting diagrams for direct-cost inputs and fixed-asset depreciation, but they need the above consistency rules and do not yet depict the complete import-to-approved-FLC lifecycle.
