# IMPLEMENTATION.md — Nagar AI Admin Side

## 1. Overview & Objectives
The goal of this sprint is to build out the **Admin Side (`apps/admin/` and admin backend router endpoints)** for the Nagar AI platform within a 4–6 hour window. 

The citizen side is fully functional (categories, multi-photo support, severity classification, and vector-based duplicate detection). The admin side must interface cleanly with the existing backend data contracts and Supabase schema.

---

## 2. Core Scope & Deliverables
1. **Admin Frontend (`apps/admin/`)**:
   * Build a modern dashboard interface (using Next.js/React, Tailwind CSS, and Lucide icons).
   * **Complaint Management Table**: List all incoming complaints with pagination, status filters (pending, in-progress, resolved, etc.), and category tags.
   * **Complaint Detail View**: View individual complaint details, multiple attached evidence photos (`image_urls`), description, citizen info, AI severity classification, and duplicate match links.
   * **Status & Action Controls**: Allow admins to update complaint statuses and write prediction/resolution notes that write back to the database.

2. **Backend Admin Integration (`backend/app/routers/admin.py`)**:
   * Implement or verify admin router endpoints matching the requirements in `docs/API_CONTRACT.md`.
   * Ensure secure fetching of complaints, filtering capabilities, and status mutation routes.

---

## 3. Data Schema & API Contract References
* **Complaints Data Shape**: Read from the existing schema where `category` is citizen-selected and photos are stored as an array (`image_urls`, plural)[cite: 2].
* **Database Target**: Write admin risk predictions and updates to the `predictions` table and status fields already set up in `nagar_ai_schema.sql`[cite: 2].
* **API Contracts**: Follow route schemas strictly as specified in `docs/API_CONTRACT.md`.

---

## 4. Step-by-Step Execution Plan for Opencode

### Step 1: Scaffold Admin App Shell
* Set up the Next.js application inside `apps/admin/`.
* Configure layout with a fixed sidebar navigation, top header, and clear structural sections.

### Step 2: Implement Dashboard Overview & Complaint Tables
* Connect to the backend API (`http://localhost:8000`) to fetch all complaints.
* Render a searchable, filterable data table displaying complaint ID, category, submission date, AI severity badge, and current status.

### Step 3: Implement Complaint Detail & Action Panel
* Build a detail drawer or dynamic route page (`/complaints/[id]`) showing full metadata, multiple photo previews, duplicate match references, and severity tags.
* Add action controls allowing the admin to transition complaint statuses and submit notes.

### Step 4: Verify Backend Admin Endpoints
* Review `backend/app/routers/admin.py` to ensure all query filters and update methods handle incoming requests correctly without breaking existing citizen workflows.