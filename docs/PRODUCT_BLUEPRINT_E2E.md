# InfraNexus End-to-End Product Blueprint

## 1. Product Intent
InfraNexus is a ServiceNow CMDB Graph Visualizer that converts CMDB records into a live, navigable 3D dependency map. The product purpose is to reduce incident blast radius, improve change confidence, accelerate onboarding, and expose CMDB quality gaps.

## 2. Outcomes and Success Conditions
- Infrastructure discovery is visual, fast, and dependency-aware.
- Users can find any CI quickly and understand its impact context.
- Graph exploration remains performant at enterprise scale.
- CMDB data freshness is sustained with incremental sync.
- Product is operable end-to-end on a single local machine.

## 3. User Segments and Contextual Jobs
| User Type | Context | Primary Job | Product Support |
|---|---|---|---|
| SRE / Infra Engineer | Change windows, outage triage | See upstream/downstream impact before action | Neighborhood graph, filters, path exploration |
| Platform Engineer | Architecture decisions | Understand service topology and hidden dependencies | Class-centric exploration, cluster view |
| CMDB Admin | Data governance | Detect stale, orphaned, and malformed records | Sync dashboards, validation status, topology anomalies |
| IT Leadership | Portfolio visibility | Understand system criticality and operational exposure | High-level cluster summaries and KPI views |

## 4. End-to-End Product Scope
### 4.1 Data Source Layer
- ServiceNow CMDB tables provide CI entities and relationship edges.
- Relationship direction is preserved with forward/reverse semantics.
- Data freshness is managed through update bookmarks.

### 4.2 Ingestion and Normalization Layer
- Full synchronization initializes all baseline records.
- Incremental synchronization applies only deltas.
- CI classes are normalized into product labels while retaining original class names.
- Environment and status fields are standardized for consistent filtering.
- Validation gates reject malformed records and preserve audit counts.

### 4.3 Graph and Search Data Layer
- Graph store represents CIs as nodes and relations as directed edges.
- Search index supports rapid retrieval by name, IP, and metadata.
- Cache layer accelerates repeated graph and CI detail access.
- Data model preserves lineage, freshness timestamp, and operational state.

### 4.4 API and Delivery Layer
- Graph neighborhood, path, CI detail, and search are exposed as product APIs.
- Request lifecycle includes input checks, timing capture, and controlled response shape.
- Public APIs enforce bounded payload and abuse protection.

### 4.5 Experience Layer
- Search-driven entry into graph exploration.
- Progressive expansion from selected nodes.
- Context panels provide CI metadata and relationship context.
- Filters and controls tailor topology to role-specific needs.
- Real-time sync status keeps users informed of freshness.

### 4.6 Reliability and Governance Layer
- Local-first deployment with deterministic startup order.
- Health and readiness visibility across all services.
- Secret handling, request controls, and data minimization controls.
- Observability for latency, cache behavior, and ETL throughput.

## 5. Full Functionality Blueprint (Contextual)
### 5.1 Discovery and Navigation
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| Global search | User knows CI name fragment | Search input | Ranked CI candidates |
| Autocomplete suggestions | User typing rapidly | Prefix entry | Immediate shortlist |
| Search-to-focus | User picks a CI | Result selection | Graph centered on chosen CI |
| Click-to-inspect | User reviews node details | Node click | Detail panel updates |
| Progressive expansion | User explores dependencies | Node expansion action | Subgraph enrichment |
| Path analysis | User validates impact route | Source-target selection | Highlighted shortest route |
| Cluster overview | User needs macro topology | Cluster mode selection | Aggregated topology view |

### 5.2 Topology Control
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| Hop depth control | Broader or tighter context needed | Hop selector | Expansion radius changes |
| CI class filter | User isolates technology domains | Class filter toggle | Domain-specific graph visibility |
| Relationship filter | User isolates dependency semantics | Relationship toggle | Edge subset visibility |
| Environment filter | User isolates prod/non-prod | Environment toggle | Risk-focused topology |
| Layout mode switch | User needs alternative readability | Layout selector | Topology re-projection |
| Camera reset and fit | User loses orientation | View control action | Restored navigable framing |
| Minimap orientation | User explores dense graph | Minimap enabled | Faster global navigation |

### 5.3 CI Context and Governance
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| CI inspector | User needs CI metadata | Node selection | Class, owner, status, location context |
| Relationship list | User needs directional links | Inspector open | Incoming/outgoing relation understanding |
| CI timeline | User investigates change history | Timeline tab selection | Temporal change context |
| Operational state emphasis | User triages incidents | Status mapping active | Critical/non-critical visual distinction |
| Data quality surfacing | Admin audits CMDB quality | Validation insights view | Rejected/stale/orphan signal visibility |

### 5.4 ETL and Freshness
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| Full bootstrap sync | Initial setup | Manual or first-run action | Complete baseline dataset |
| Incremental sync | Ongoing operations | Scheduled execution | Low-latency data freshness |
| Retry and backoff control | Upstream throttling occurs | Rate-limit event | Stable sync continuation |
| Sync state tracking | Team monitors pipeline | Status request | Progress and outcome visibility |
| Cache invalidation on updates | Fresh data enters system | Sync write completion | Stale graph responses avoided |
| Real-time ETL status | Users need live status | WebSocket event stream | Immediate freshness awareness |

### 5.5 Platform Reliability and Security
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| Health and readiness checks | Startup and operations | Service probes | Deterministic availability checks |
| Request timing telemetry | Performance management | Request completion | Latency visibility |
| Cache hit/miss telemetry | Optimization workflow | Cache interaction | Efficiency diagnostics |
| Rate limiting | Abuse or accidental flood | Threshold crossing | Controlled API access |
| Input validation | Unsafe user input | Request ingress | Protected backend behavior |
| Secret isolation | Credential safety | Runtime initialization | Secure configuration lifecycle |

### 5.6 Offline and Productivity
| Functionality | User Context | Trigger | Outcome |
|---|---|---|---|
| Last-view offline persistence | Network/backend unavailable | Offline detection | Restored prior graph context |
| Keyboard control layer | Power-user workflows | Key actions | Faster navigation and operations |
| Theme switching | Visual ergonomics | Theme toggle | Readability and preference alignment |
| Snapshot/export view | Reporting and communication | Export action | Shareable topology image |

## 6. ServiceNow Domain Blueprint
### 6.1 CI Semantics
- Every CI has identity, class, lifecycle state, environment, and ownership context.
- Class hierarchy supports servers, VMs, applications, services, databases, network devices, load balancers, storage, and cloud artifacts.

### 6.2 Relationship Semantics
- Directed relationships define operational and structural dependencies.
- Forward and reverse labels are both retained for user interpretation.
- Common semantic families include hosting, dependency, containment, membership, and connectivity.

### 6.3 Topology Behavior at Scale
- Degree distribution is skewed and includes super-nodes.
- Unbounded exploration produces noisy visuals and latency penalties.
- Bounded neighborhoods and degree-aware expansion are mandatory controls.

## 7. Data and Interaction Guardrails
- Never send full graph to the client.
- Keep user-visible graph within bounded node limits.
- Preserve selection and visual continuity during expansion.
- Keep updates incremental and idempotent.
- Ensure every request path has validation, timing, and safe error handling.

## 8. Operating Model
### 8.1 Run Model
- One local deployment command starts all required services.
- Service health controls startup order and troubleshooting confidence.
- Persistent local volumes retain graph/cache/search state.

### 8.2 Lifecycle Model
- Bootstrap stage establishes baseline data.
- Continuous stage maintains freshness through incremental sync.
- Improvement stage tunes performance and extends features safely.

## 9. Risk and Mitigation Blueprint
| Risk | Impact | Mitigation Blueprint |
|---|---|---|
| Super-node explosion | Slow queries and unusable visuals | Degree thresholds + bounded neighborhoods |
| Upstream throttling | Delayed freshness | Exponential backoff + incremental strategy |
| Stale cache responses | Incorrect user decisions | Event-driven invalidation + short TTL policy |
| Search irrelevance | Poor discoverability | Faceted filtering + ranking tuning |
| Rendering degradation | Poor usability | LOD policy + bounded payloads |
| Misconfiguration | Startup instability | Health-gated dependencies + explicit env contracts |

## 10. Acceptance Blueprint
### 10.1 Functional Acceptance
- Search, inspect, expand, filter, path, and sync workflows are consistently executable.
- CI and relationship semantics remain intact from source to UI.

### 10.2 Performance Acceptance
- Graph neighborhood retrieval is responsive under enterprise-scale datasets.
- Search and suggestion remain low-latency under sustained use.
- First meaningful graph interaction meets startup target.

### 10.3 Reliability Acceptance
- Incremental sync recovers gracefully from transient failures.
- Local environment can restart without data-loss surprises.

### 10.4 Security Acceptance
- Sensitive configuration remains externalized and unexposed.
- Public request surfaces are validated, bounded, and monitored.

## 11. Delivery Blueprint (Phase View)
| Phase | Outcome |
|---|---|
| Phase 1 | Local stack, baseline APIs, initial search and graph shell |
| Phase 2 | Full/incremental ETL and canonical domain normalization |
| Phase 3 | End-user exploration core: search, inspect, expand, filter |
| Phase 4 | Advanced topology: pathing, clusters, minimap, richer controls |
| Phase 5 | Hardening: telemetry, quality gates, resilience and governance |

## 12. Blueprint Visual Pack
This blueprint is accompanied by the following diagram files:
- docs/blueprint-diagrams/01-system-architecture.mmd
- docs/blueprint-diagrams/02-data-lifecycle.mmd
- docs/blueprint-diagrams/03-user-journey.mmd
- docs/blueprint-diagrams/04-delivery-roadmap.mmd
- docs/blueprint-diagrams/05-functionality-map.mmd

Together, this document and the visual pack provide the complete end-to-end product picture without implementation code.