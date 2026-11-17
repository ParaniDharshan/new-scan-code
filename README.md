# Mermaid ER Diagram

```mermaid
erDiagram

    COMPANY ||--o{ DEPARTMENTS : has
    COMPANY ||--o{ EMPLOYEES : owns

    DEPARTMENTS ||--o{ EMPLOYEES : contains

    EMPLOYEES ||--o{ SALARY : has
    EMPLOYEES ||--o{ LIFE_INSURANCE : has
    EMPLOYEES ||--o{ HEALTH_INSURANCE : has
    EMPLOYEES ||--o{ PROFESSIONAL_CERTIFICATION_REIMBURSEMENT : has
    EMPLOYEES ||--o{ HOLIDAY_BONUS : has
    EMPLOYEES ||--o{ DER : assigned
    EMPLOYEES ||--o{ SOFTWARE_ACCESS : uses

    COMPANY {
        ObjectId comp_id PK
        string companycode
        string companyname
        string registeredname
        string currency
        boolean isactive
        datetime created_at
        datetime updated_at
    }

    DEPARTMENTS {
        ObjectId dept_id PK
        ObjectId comp_id FK
        string deptcode
        string deptname
        boolean isactive
        string created_by
        datetime created_at
        string updated_by
        datetime updated_at
    }

    EMPLOYEES {
        ObjectId emp_id PK
        ObjectId comp_id FK
        ObjectId dept_id FK
        string emp_code
        string emp_name
        string email
        string designation
        string status
        datetime created_at
        datetime updated_at
    }

    SALARY {
        ObjectId sal_id PK
        ObjectId emp_id FK
        date effective_from
        number annual_salary
        number monthly_salary
        string remarks
        string status
    }

    LIFE_INSURANCE {
        ObjectId li_id PK
        ObjectId emp_id FK
        string policy_no
        string provider
        number annual_amount
        number effective_year
    }

    HEALTH_INSURANCE {
        ObjectId hi_id PK
        ObjectId emp_id FK
        string policy_no
        string provider
        number annual_amount
        number effective_year
    }

    PROFESSIONAL_CERTIFICATION_REIMBURSEMENT {
        ObjectId pcr_id PK
        ObjectId emp_id FK
        string certification_name
        string provider
        number amount
        date reimbursement_date
        number effective_year
    }

    HOLIDAY_BONUS {
        ObjectId hb_id PK
        ObjectId emp_id FK
        number amount
        number effective_year
    }

    DER {
        ObjectId der_id PK
        ObjectId emp_id FK
        string asset_name
        string asset_type
        number purchase_cost
        number depreciation_rate
        number scrap_percentage
        number annual_depreciation
        date purchase_date
    }

    SOFTWARE_ACCESS {
        ObjectId des_id PK
        ObjectId emp_id FK
        string software_name
        string software_type
        number annual_cost
        number effective_year
    }
```

---

# Relationship Matrix

| Parent | Child | Cardinality |
|----------|----------|----------|
| Company | Departments | 1 : Many |
| Company | Employees | 1 : Many |
| Department | Employees | 1 : Many |
| Employee | Salary | 1 : Many |
| Employee | Life Insurance | 1 : Many |
| Employee | Health Insurance | 1 : Many |
| Employee | Professional Certification Reimbursement | 1 : Many |
| Employee | Holiday Bonus | 1 : Many |
| Employee | DER Assets | 1 : Many |
| Employee | Software Access | 1 : Many |

---

# Direct Cost Data Flow

```mermaid
flowchart TD

    A[Company]

    A --> B[Departments]

    B --> C[Employees]

    C --> D[Salary]
    C --> E[Life Insurance]
    C --> F[Health Insurance]
    C --> G[Professional Certification]
    C --> H[Holiday Bonus]
    C --> I[DER Depreciation]
    C --> J[Software Access]

    D --> K[Direct Labour]
    E --> K
    F --> K
    G --> K
    H --> K

    I --> L[Direct Material]
    J --> L

    K --> M[Total Direct Cost]

    L --> M
```

---

# Employee Cost Aggregation View

```mermaid
flowchart LR

    EMP[Employee]

    EMP --> SAL[Salary]
    EMP --> LI[Life Insurance]
    EMP --> HI[Health Insurance]
    EMP --> PCR[Certification]
    EMP --> HB[Holiday Bonus]
    EMP --> DER[DER Assets]
    EMP --> SA[Software Access]

    SAL --> DC[Direct Cost]
    LI --> DC
    HI --> DC
    PCR --> DC
    HB --> DC
    DER --> DC
    SA --> DC
```
