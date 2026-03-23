# InfraNexus End-to-End Picture File

This file is the single visual blueprint view of the product using Mermaid diagrams.

## 1) End-to-End System Picture

```mermaid
flowchart TB
    subgraph Source[Source Domain]
        SN[ServiceNow CMDB\nCI + Relationships]
    end

    subgraph Ingestion[Ingestion and Quality]
        EX[Extract]
        NO[Normalize]
        VA[Validate]
        FS[Full Sync]
        IS[Incremental Sync]
    end

    subgraph Platform[Core Platform]
        GS[Graph Store]
        SS[Search Store]
        CS[Cache Store]
        AP[API Layer]
        GV[Governance\nValidation + Rate Controls]
        OB[Observability\nLatency + Throughput + Health]
    end

    subgraph Experience[User Experience]
        SR[Search + Suggest]
        GR[3D Graph Exploration]
        IN[CI Inspector + Relationship Context]
        FL[Filters + Layout + Navigation]
        PT[Path + Cluster Insights]
        ET[Live Freshness Signals]
    end

    subgraph Outcomes[Business Outcomes]
        IM[Faster Impact Analysis]
        CH[Safer Change Decisions]
        DQ[Better CMDB Data Quality]
        ON[Faster Team Onboarding]
    end

    SN --> EX --> NO --> VA
    VA --> FS --> GS
    VA --> IS --> GS
    IS --> SS
    FS --> SS
    IS --> CS

    GS --> AP
    SS --> AP
    CS --> AP
    GV --> AP
    AP --> OB

    AP --> SR --> GR
    GR --> IN
    GR --> FL
    GR --> PT
    AP --> ET

    IN --> IM
    PT --> CH
    ET --> DQ
    SR --> ON
```

## 2) Data Lifecycle Picture

```mermaid
flowchart TD
    A[Start: ServiceNow Data Source]
    B[Extract CI and Relationship Records]
    C[Normalize Classes, Status, Environment]
    D[Validate Identity and Required Fields]
    E{Valid Record?}
    F[Reject and Audit with Reason]
    G[Load Graph Entities and Directed Edges]
    H[Index Search Documents]
    I[Update Freshness Bookmark]
    J[Invalidate Affected Cache Segments]
    K[Emit Sync Progress and Completion Events]
    L[Serve Fresh Queries to Users]

    A --> B --> C --> D --> E
    E -- No --> F
    E -- Yes --> G --> H --> I --> J --> K --> L
```

## 3) User Journey Picture

```mermaid
journey
    title InfraNexus End-to-End User Journey
    section Entry and Discovery
      Open application shell: 5: User
      Start CI search: 5: User
      Review autocomplete candidates: 4: User
      Select target CI: 5: User
    section Topology Exploration
      View centered neighborhood graph: 5: User
      Inspect CI context panel: 4: User
      Expand related nodes progressively: 5: User
      Apply class/environment filters: 4: User
      Trace shortest dependency path: 4: User
    section Decision and Action
      Assess impact boundary: 5: User
      Capture/share topology snapshot: 3: User
    section Freshness and Trust
      Observe sync status updates: 4: User
      Confirm latest data context: 5: User
```

## 4) Delivery Roadmap Picture

```mermaid
timeline
    title InfraNexus Delivery Roadmap Blueprint
    Phase 1 : Platform Foundation
            : Local-first runtime and service baseline
            : Health/readiness and base contracts
    Phase 2 : Data Pipeline Core
            : Full sync baseline
            : Incremental freshness model
            : Validation and normalization controls
    Phase 3 : Product Core Experience
            : Search and focused neighborhood exploration
            : CI context, filters, and navigation controls
    Phase 4 : Advanced Insight Layer
            : Path analysis and cluster perspective
            : Rich topology operations and productivity UX
    Phase 5 : Hardening and Trust
            : Observability, quality gates, governance
            : Operational resilience at target scale
```

## 5) Functionality Map Picture

```mermaid
mindmap
  root((InfraNexus Functionality Map))
    Discovery
      Global Search
      Autocomplete
      Search-to-focus
    Graph Exploration
      Neighborhood Expansion
      CI Inspector
      Relationship Context
      Path Analysis
      Cluster Overview
    Controls
      Hop Depth
      Class Filter
      Environment Filter
      Relationship Filter
      Layout Switch
      Camera Reset/Fit
      Minimap
    Freshness
      Full Sync
      Incremental Sync
      Retry and Backoff
      Sync Progress Signals
      Cache Invalidation
    Reliability
      Health Checks
      Readiness Checks
      Bounded Payloads
      Rate Controls
    Security
      Secret Isolation
      Input Validation
      Safe Error Surfaces
      Access Evolution
    Quality
      Unit and Integration Coverage
      End-to-End Flow Validation
      Performance Budgets
      Accessibility Assurance
    Productivity
      Keyboard Navigation
      Theme Switching
      Offline Last-View
      Exportable Topology Views
```
