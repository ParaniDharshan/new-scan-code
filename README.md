# Fully Loaded Cost (FLC) - Direct Cost Module Database Design

## Overview

This document describes the database structure for the Direct Cost Module of the Fully Loaded Cost (FLC) application.

The design currently consists of the following collections:

```text
company
departments
employees

salary
life_insurance
health_insurance
professional_certification_reimbursement
holiday_bonus

dedicated_employee_resource (DER)
dedicated_employee_resource_software_access
```

---

# High Level ER Diagram

```text
┌─────────────────┐
│     COMPANY     │
└────────┬────────┘
         │
         │ 1 : M
         ▼
┌─────────────────┐
│   DEPARTMENTS   │
└────────┬────────┘
         │
         │ 1 : M
         ▼
┌─────────────────┐
│    EMPLOYEES    │
└────────┬────────┘
         │
         │ 1 : M
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼

 ┌──────────────┐               ┌──────────────┐
 │    SALARY    │               │ LIFE INSURANCE│
 └──────────────┘               └──────────────┘

         │
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼

┌────────────────┐          ┌─────────────────────────┐
│HEALTH INSURANCE│          │ PROFESSIONAL CERTIFICATION │
└────────────────┘          └─────────────────────────┘

         │
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼

┌────────────────┐        ┌─────────────────────────┐
│ HOLIDAY BONUS  │        │ DEDICATED EMPLOYEE      │
└────────────────┘        │ RESOURCE (DER)          │
                          └─────────────────────────┘

                                      │
                                      │
                                      ▼

                        ┌────────────────────────────┐
                        │ SOFTWARE ACCESS            │
                        └────────────────────────────┘
```

---

# Collection Relationship Flow

```text
Company
  │
  ├── Departments
  │       │
  │       └── Employees
  │               │
  │               ├── Salary
  │               ├── Life Insurance
  │               ├── Health Insurance
  │               ├── Holiday Bonus
  │               ├── Certification Reimbursement
  │               ├── DER Assets
  │               └── Software Access
```

---

# 1. COMPANY

## Purpose

Stores organization details.

## Collection

```json
{
  "_id": ObjectId,
  "companyCode": "KOPL",
  "companyName": "KOPL Pvt Ltd",
  "registeredName": "KOPL Private Limited",
  "currency": "INR",
  "isActive": true,
  "createdAt": Date,
  "updatedAt": Date
}
```

## Relationships

```text
Company
  └── Departments
  └── Employees
```

## Referenced By

```text
Departments.compId
Employees.compId
```

---

# 2. DEPARTMENTS

## Purpose

Stores organizational departments.

Example:

```text
RG  -> Revenue Generation
AD  -> Administrative
RE  -> Reserve
```

## Collection

```json
{
  "_id": ObjectId,
  "compId": ObjectId,
  "deptCode": "RG",
  "deptName": "Revenue Generation",
  "isActive": true,
  "createdBy": "Admin",
  "createdAt": Date,
  "updatedBy": "Admin",
  "updatedAt": Date
}
```

## Relationships

```text
Company
   │
   └── Departments
             │
             └── Employees
```

## Referenced By

```text
Employees.deptId
```

---

# 3. EMPLOYEES

## Purpose

Stores employee master information.

## Collection

```json
{
  "_id": ObjectId,
  "compId": ObjectId,
  "deptId": ObjectId,
  "empCode": "EMP001",
  "empName": "Saravana Kumar",
  "email": "saravana@company.com",
  "designation": "Software Engineer",
  "status": "ACTIVE",
  "createdAt": Date,
  "updatedAt": Date
}
```

## Relationships

```text
Employee
   │
   ├── Salary
   ├── Life Insurance
   ├── Health Insurance
   ├── Professional Certification
   ├── Holiday Bonus
   ├── DER
   └── Software Access
```

---

# 4. SALARY

## Purpose

Stores annual and monthly salary details.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "effectiveFrom": "2026-01-01",
  "annualSalary": 300000,
  "monthlySalary": 25000,
  "remarks": "",
  "status": "ACTIVE",
  "createdBy": "Admin",
  "createdAt": Date,
  "updatedBy": "Admin",
  "updatedAt": Date
}
```

## Reference

```text
empId -> Employees._id
```

---

# 5. LIFE INSURANCE

## Purpose

Stores employee life insurance details.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "policyNo": "LIC001",
  "provider": "LIC",
  "annualAmount": 6453,
  "effectiveYear": 2026,
  "createdBy": "Admin",
  "createdAt": Date,
  "updatedBy": "Admin",
  "updatedAt": Date
}
```

## Reference

```text
empId -> Employees._id
```

---

# 6. HEALTH INSURANCE

## Purpose

Stores employee health insurance cost.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "policyNo": "HI001",
  "provider": "Star Health",
  "annualAmount": 12000,
  "effectiveYear": 2026,
  "createdBy": "Admin",
  "createdAt": Date,
  "updatedBy": "Admin",
  "updatedAt": Date
}
```

## Reference

```text
empId -> Employees._id
```

---

# 7. PROFESSIONAL CERTIFICATION REIMBURSEMENT

## Purpose

Stores employee certification reimbursements.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "certificationName": "Azure Fundamentals",
  "provider": "Microsoft",
  "amount": 4500,
  "reimbursementDate": "2026-06-01",
  "effectiveYear": 2026
}
```

## Reference

```text
empId -> Employees._id
```

---

# 8. HOLIDAY BONUS

## Purpose

Stores annual holiday bonus.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "amount": 6000,
  "effectiveYear": 2026
}
```

## Reference

```text
empId -> Employees._id
```

---

# 9. DEDICATED EMPLOYEE RESOURCE (DER)

## Purpose

Stores employee-specific assets and depreciation.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "assetName": "Dell Latitude Laptop",
  "assetType": "Laptop",
  "purchaseCost": 67757,
  "depreciationRate": 27,
  "scrapPercentage": 20,
  "annualDepreciation": 18294.39,
  "purchaseDate": "2026-01-01",
  "createdBy": "Admin",
  "createdAt": Date,
  "updatedBy": "Admin",
  "updatedAt": Date
}
```

## Reference

```text
empId -> Employees._id
```

---

# 10. DEDICATED EMPLOYEE RESOURCE SOFTWARE ACCESS

## Purpose

Stores employee specific software access costs.

## Collection

```json
{
  "_id": ObjectId,
  "empId": ObjectId,
  "softwareName": "Microsoft 365",
  "softwareType": "EMAIL_LICENSE",
  "annualCost": 3600,
  "effectiveYear": 2026
}
```

## Reference

```text
empId -> Employees._id
```

---

# Complete Foreign Key Map

```text
COMPANY
│
├── compId
│
├──────────────► DEPARTMENTS.compId
│
└──────────────► EMPLOYEES.compId


DEPARTMENTS
│
└── deptId
     │
     └────────► EMPLOYEES.deptId


EMPLOYEES
│
├── empId
│
├──────────────► SALARY.empId
├──────────────► LIFE_INSURANCE.empId
├──────────────► HEALTH_INSURANCE.empId
├──────────────► PROFESSIONAL_CERTIFICATION.empId
├──────────────► HOLIDAY_BONUS.empId
├──────────────► DER.empId
└──────────────► SOFTWARE_ACCESS.empId
```

---

# Direct Cost Calculation Flow

```text
Employee
   │
   ├── Salary
   │
   ├── Life Insurance
   │
   ├── Health Insurance
   │
   ├── Professional Certification
   │
   ├── Holiday Bonus
   │
   ├── DER Depreciation
   │
   └── Software Access
          │
          ▼

Total Direct Cost

(Direct Labour)
+
(Direct Material)

=

Fully Loaded Cost Module Input
```

## Direct Labour

```text
Salary
+
Life Insurance
+
Health Insurance
+
Holiday Bonus
+
Professional Certification
```

## Direct Material

```text
DER Depreciation
+
Software Access
```

## Final Formula

```text
Total Direct Cost
=
Direct Labour
+
Direct Material
```
