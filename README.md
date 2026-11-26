# FLC360 Application Workflow

## 1. What the application does

FLC360 is a cost-management dashboard for organizing employee and department information, importing fixed-asset data, calculating cost allocation and fully loaded cost (FLC), and reviewing or exporting results.

The project has two parts:

- **Client:** A React single-page application built and served by Vite. Its screens, navigation, sample records, and much of the displayed dashboard data are defined in the client.
- **Server:** An Express API that provides calculation, dashboard, master-data, and fixed-asset upload endpoints. MongoDB is used for fixed-asset records and is also the configured persistence layer for the server's data models.

The interface is an administrative dashboard rather than a public-facing site. There is no sign-in flow in the current client. The profile name and role shown in the header are display values, not proof of an authenticated session.

## 2. Starting the project

### Prerequisites

1. Install a supported version of Node.js and npm.
2. Install the npm dependencies separately in the `server` and `client` project folders.
3. Start MongoDB locally, or configure the server to use an available MongoDB instance. The example server environment file documents the expected database connection setting. Fixed-asset reads and uploads require a working database connection.

### Start the server

From the `server` folder, run the package's development script. The API listens on port 5000 by default. It attempts to connect to the configured MongoDB database before starting; if the connection fails, it still starts in a reduced, database-disconnected mode.

### Start the client

From the `client` folder, run the Vite development script. Open the local client address printed by Vite, normally `http://localhost:5173`.

The Vite development server forwards requests under the API path to the server on port 5000. This lets the client call the API using same-origin relative URLs during local development.

### What appears at startup

The browser loads the client's HTML entry page, which mounts the React application into the page. The application initializes its navigation on **Dashboard**, applies the shared theme and layout, and displays the side navigation, top bar, and selected screen. Employee, department, team, and catalog data are initialized from client-side sample records.

There is no required login or setup wizard in the current application. The dashboard can be viewed without MongoDB, but database-backed asset features will report that the database is unavailable.

## 3. End-to-end business workflow

The intended operational flow is:

1. **Choose the financial period.** Review the financial year and the FLC version that reports should represent. The client currently uses sample financial-year and version values in several screens.
2. **Maintain organizational masters.** Create or review departments, teams, and employees. Departments classify people as revenue-generating, administrative, or reserve; teams belong to departments; employees can be assigned to both. These relationships are inputs to allocation and analysis.
3. **Maintain employee cost inputs.** Add resource, software, and insurance records and associate them with employees where applicable. These records help describe employee-related cost inputs in the interface.
4. **Import fixed assets.** In Upload Center, select an Excel workbook for fixed assets. The server validates the workbook's columns and rows, then inserts or updates assets in MongoDB using asset code as the matching key. Successful imports are made available to asset category and depreciation summaries.
5. **Review and calculate allocation.** Use Ratio Calculation or the dashboard calculation action to send working-hour and employee assumptions to the API. The API returns a simplified allocation ratio and calculation result. The current controls submit fixed sample assumptions rather than collecting all values from the master screens.
6. **Review cost allocation and FLC.** Data Analysis calculates employee direct costs, allocates indirect expense pools and depreciation, apportions administrative costs across revenue employees, and presents cost allocation and fully loaded cost views. Fixed-asset depreciation is requested from the server; if that request fails, the screen uses sample depreciation pools.
7. **Approve and export.** Review the analysis and use the report download controls to export the current report or both report views as CSV. Reports is another entry point to the same analysis/report content.
8. **Track versions and communicate results.** Version Management and dashboard indicators represent the active and archived calculation versions. Analytics screens provide summary views for cost composition, department comparisons, and trends.
9. **Finish the reporting cycle.** A business cycle is complete when the figures for the chosen financial year and version have been reviewed and the required reports have been exported. The application itself does not have a dedicated “close workflow” or sign-out process implemented. Stop the client and server development processes when finished; the MongoDB service is independent.

## 4. How data moves through the application

- **Navigation and screen state:** The side navigation changes the active screen within the same React application; it does not load separate web pages or require a full browser navigation. The top search menu can navigate to matching pages or to the Employee screen for a matching employee.
- **Client-side records:** Department, team, employee, resource, software, and insurance records are held in React state and initialized with sample data. Changes to these records are not currently saved to MongoDB and generally return to their initial sample values after a full page reload.
- **API requests:** The client calls the Express API for the FLC calculation, fixed-asset workbook upload, and fixed-asset category/depreciation data. The server responds with JSON; the client displays results or relevant error messages.
- **Database-backed assets:** Fixed assets are stored in MongoDB. The server validates workbook type and size, required headers, values, and duplicate asset codes within the workbook before writing records. A successful import updates or creates records by asset code.
- **CSV reports:** Report downloads are assembled in the browser and saved as CSV files. They are not generated or stored by the server.
- **Illustrative data:** Several chart values, list rows, user details, and cost inputs are currently sample or hard-coded values. Treat them as demonstration data, not verified business results.

## 5. Pages and why each matters

### Dashboard

The landing and monitoring screen. It summarizes financial year, active version, employee count, and average FLC per hour, and shows cost composition, cost trends, department distribution, and employee status. The **Run FLC Calculation** action calls the calculation API and displays its returned ratio and assumptions.

**Importance:** Gives administrators a quick overview and a starting point for initiating or navigating the calculation workflow. Several displayed metrics and chart series are currently sample values.

### Administration

- **Financial Year:** Lists financial periods, their start and end dates, status, and associated version. The screen also presents an action to add a period.
  - **Importance:** Defines the reporting period so costs and reports can be interpreted against the correct year. The current list and add action are demonstration UI rather than a persistent financial-year API workflow.
- **User Management:** Shows example users, roles, departments, and statuses, with an add-user action.
  - **Importance:** Represents where access would be managed in a complete application. User and authentication models exist on the server, but this screen is not connected to a working login or user-management API.

### Masters

- **Department:** Maintains department code, name, department type, and status.
  - **Importance:** Department type is important for separating revenue, administrative, and reserve populations during cost allocation.
- **Team:** Maintains teams and their parent department.
  - **Importance:** Organizes employees below departments and supports the people structure used elsewhere in the interface.
- **Employee:** Maintains employee identity, department, team, joining details, working hours, status, and related assignments.
  - **Importance:** Employees are the central allocation units; their type and working hours affect cost assignment and per-hour FLC.
- **Resource Items:** Catalogs physical resources and allows assignment to employees.
  - **Importance:** Represents employee-specific resource costs such as hardware or equipment.
- **Software:** Catalogs software or licenses and allows assignment to employees.
  - **Importance:** Represents software costs associated with employees.
- **Insurance:** Catalogs insurance information and allows assignment to employees.
  - **Importance:** Represents employee-related insurance costs.

Department, team, employee, resource, software, and insurance editing is handled in the browser's current state. These screens provide create, edit, delete, search, or grouping interactions as appropriate, but their changes are not persisted to the server in the current implementation.

### Data Management

- **Upload Center:** Shows upload history examples and provides a fixed-asset Excel upload. The workbook must include asset code, asset name, category, purchase cost, purchase date, and useful life; residual value is optional. Only Excel workbooks are accepted, with a 10 MB upload limit.
  - **Importance:** Brings fixed-asset purchase data into the application so depreciation can be summarized and included in analysis. This is the main data-management workflow currently connected to MongoDB.
- **Data Analysis:** Displays cost allocation detail and fully loaded cost views for the selected financial year, including employee-level and cost-pool information. It can download the current view or a combined report.
  - **Importance:** This is the main review stage between cost inputs and report delivery. It is the most detailed screen for understanding how direct costs, indirect pools, depreciation, and administrative allocation contribute to FLC.

### FLC Engine

- **Ratio Calculation:** Presents department types, working hours, employee counts, and ratio weights, with an action to calculate.
  - **Importance:** Makes the allocation assumptions visible before interpreting cost distribution. The present action submits fixed assumptions to the API; the table is illustrative.
- **FLC Processing:** Lists calculation stages such as direct cost allocation, variable cost allocation, depreciation allocation, and administrative apportionment.
  - **Importance:** Communicates the sequence and status of processing needed to produce fully loaded costs. Its listed processing history is sample content; the current action invokes the simplified calculation API.
- **Version Management:** Shows calculation versions, financial year, generation date, employee count, status, and owner, and offers a create-version action.
  - **Importance:** Helps compare the current calculation with prior snapshots and identify which version is active. The page is not currently connected to a version persistence API.

### Reports

The Reports screen presents the report-oriented version of Data Analysis, including cost allocation and fully loaded cost views with CSV download options.

**Importance:** Provides a focused place to review and export results after calculation. It currently uses the same analysis logic and source data as Data Analysis rather than a separate reporting service.

### Analytics

- **Cost Breakdown:** Summarizes direct cost, indirect cost pools, percentages, monthly averages, and trends.
  - **Importance:** Shows the overall mix of costs and helps identify which components contribute most to the total.
- **Department Analysis:** Compares employee counts, average FLC per hour, monthly cost, and cost share by department.
  - **Importance:** Helps managers compare cost distribution across organizational groups.
- **Cost Trends:** Shows cost and average-FLC values across reporting periods.
  - **Importance:** Helps identify changes over time. Current values are illustrative rather than dynamically generated from saved calculation history.

These analytics screens currently use sample rows and provide export-style actions; they are not yet backed by a dedicated analytics API.

### Settings

Displays example organization and report settings such as standard working hours, currency, and cost precision.

**Importance:** Represents the place for organization-wide calculation and display preferences. The current settings page is a generic demonstration screen; settings are not applied as persistent configuration.

## 6. Calculation and reporting notes

- The calculation API receives revenue hours, administrative hours, and employee counts and returns a simplified ratio and allocation value. The dashboard and FLC Engine currently send preset sample values.
- Data Analysis has its own cost-allocation presentation logic. It treats employee costs as direct costs, distributes sample variable-cost pools using a fixed one-ninth allocation ratio, adds depreciation pools, and allocates administrative costs across revenue employees.
- The final employee FLC view presents direct cost per hour, two indirect components per hour, total indirect cost per hour, and fully loaded cost per hour and month.
- These calculation paths are not yet a unified, persisted calculation pipeline. In particular, the server's ratio response and the detailed client-side Data Analysis calculations are distinct.
- Downloaded reports are CSV files generated from the data currently shown in the client. A download is not the same as saving or approving a calculation version on the server.

## 7. Current implementation boundaries

- The frontend is a prototype-style single-page application. Many screens show sample values or generic rows and are not backed by server endpoints.
- The dashboard figures, user identity, trends, financial-year options, and version history are sample content.
- There is no implemented login, role enforcement, or sign-out workflow, despite user-related models and role labels in the project.
- Client-side master and catalog edits are not durable across reloads.
- Fixed-asset storage and depreciation/category summaries are the principal MongoDB-backed data flow.
- If MongoDB is unavailable, the server still provides endpoints that do not require the database, but asset upload and database-backed asset queries return an unavailable error.
- The configured client development proxy is for local development. A production deployment would need its own client hosting, API routing, database configuration, and security setup.
