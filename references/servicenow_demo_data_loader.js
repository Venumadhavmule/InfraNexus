/*
 * InfraNexus demo data loader for ServiceNow Background Scripts.
 *
 * Run from: System Definition > Scripts - Background
 * Target URL often looks like: /sys.scripts.modern.do
 *
 * What this creates:
 * - A connected, multi-department CMDB neighborhood
 * - Common infrastructure CI variants across core CMDB classes
 * - All required InfraNexus operational states (1-4)
 * - Environments spanning production, development, test, staging, qa, and dr
 * - Directed relationships in cmdb_rel_ci with robust relation-type lookup
 * - Incidents tied to the generated CIs without data-policy violations
 * - Repeated CI updates to create audit history
 *
 * Notes:
 * - InfraNexus currently ingests CIs and relationships. It does not yet ingest
 *   incident history or CI audit history into the graph timeline endpoint.
 * - This script is idempotent by CI name prefix and reuses existing records.
 * - Some CI classes may not exist on every instance. Missing tables are skipped safely.
 */
(function executeInfraNexusDemoLoad() {
    var PREFIX = 'InfraNexus Demo';
    var NOW = new GlideDateTime();
    var START_OF_LAST_WEEK = new GlideDateTime();
    START_OF_LAST_WEEK.addDaysUTC(-7);

    var ENVIRONMENTS = ['production', 'development', 'test', 'staging', 'qa', 'dr'];
    var OPERATIONAL_STATUSES = ['1', '2', '3', '4'];
    var DEPARTMENT_NAMES = [
        'Platform Engineering',
        'Network Operations',
        'Database Operations',
        'Application Engineering',
        'Security Operations',
        'Finance IT',
        'HR IT',
        'Sales IT',
        'Customer Success IT',
        'Infrastructure Reliability'
    ];
    var LOCATION_NAMES = [
        'Bengaluru DC',
        'Hyderabad DC',
        'Chennai DC',
        'Mumbai DC',
        'Pune DR Site',
        'Delhi Edge Site'
    ];
    var RELATION_CANDIDATES = {
        depends_on: [
            'Depends on::Used by',
            'Used by::Depends on',
            'Relates to::Related by'
        ],
        runs_on: [
            'Runs on::Runs',
            'Runs::Runs on',
            'Relates to::Related by'
        ],
        hosted_on: [
            'Hosted on::Hosts',
            'Hosts::Hosted on',
            'Relates to::Related by'
        ],
        contains: [
            'Contains::Contained by',
            'Contained by::Contains',
            'Relates to::Related by'
        ],
        members_of: [
            'Members of::Has members',
            'Has members::Members of',
            'Member of::Has members',
            'Has members::Member of',
            'Relates to::Related by'
        ],
        connected_by: [
            'Connected by::Connects',
            'Connects::Connected by',
            'Connected to::Connected from',
            'Connected from::Connected to',
            'Relates to::Related by'
        ],
        cluster_of: [
            'Cluster of::Clustered by',
            'Clustered by::Cluster of',
            'Relates to::Related by'
        ],
        provided_by: [
            'Provided by::Provides',
            'Provides::Provided by',
            'Relates to::Related by'
        ],
        sends_data_to: [
            'Sends data to::Receives data from',
            'Receives data from::Sends data to',
            'Relates to::Related by'
        ]
    };

    var relationshipCache = {};
    var classCounters = {};
    var departments = {};
    var locations = {};
    var created = {
        cis: 0,
        relationships: 0,
        incidents: 0,
        updates: 0,
        departments: 0,
        locations: 0,
        skipped_tables: 0
    };

    function log(message) {
        gs.info('[InfraNexus Demo Loader] ' + message);
    }

    function warn(message) {
        gs.warn('[InfraNexus Demo Loader] ' + message);
    }

    function pad(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function suffix(index) {
        return pad(index + 1);
    }

    function nextCounter(kind) {
        classCounters[kind] = (classCounters[kind] || 0) + 1;
        return classCounters[kind];
    }

    function ciName(kind, label, departmentName, environment, ordinal) {
        return [
            PREFIX,
            departmentName,
            environment,
            label,
            suffix(ordinal - 1)
        ].join(' ');
    }

    function tableExists(tableName) {
        try {
            var record = new GlideRecord(tableName);
            return record.isValid();
        } catch (error) {
            return false;
        }
    }

    function pick(list, index) {
        return list[index % list.length];
    }

    function setIfPresent(record, fieldName, value) {
        if (record.isValidField(fieldName) && value !== undefined && value !== null && value !== '') {
            record.setValue(fieldName, value);
        }
    }

    function setDateIfPossible(record, fieldName, gdt) {
        if (!record.isValidField(fieldName) || !gdt) {
            return;
        }
        record.setValue(fieldName, gdt.getValue());
    }

    function setSystemDatesIfPossible(record, createdAt, updatedAt) {
        try {
            record.autoSysFields(false);
            if (createdAt && record.isValidField('sys_created_on')) {
                record.setValue('sys_created_on', createdAt.getValue());
            }
            if (updatedAt && record.isValidField('sys_updated_on')) {
                record.setValue('sys_updated_on', updatedAt.getValue());
            }
        } catch (error) {
            warn('System date override skipped: ' + error);
        }
    }

    function findExistingByField(table, fieldName, value) {
        var record = new GlideRecord(table);
        if (!record.isValid()) {
            return null;
        }
        record.addQuery(fieldName, value);
        record.setLimit(1);
        record.query();
        if (record.next()) {
            return record;
        }
        return null;
    }

    function ensureDepartment(name) {
        if (departments[name]) {
            return departments[name];
        }

        var existing = findExistingByField('cmn_department', 'name', name);
        if (existing) {
            departments[name] = String(existing.getUniqueValue());
            return departments[name];
        }

        var department = new GlideRecord('cmn_department');
        department.initialize();
        department.setValue('name', name);
        departments[name] = String(department.insert());
        created.departments += 1;
        return departments[name];
    }

    function ensureLocation(name) {
        if (locations[name]) {
            return locations[name];
        }

        var existing = findExistingByField('cmn_location', 'name', name);
        if (existing) {
            locations[name] = String(existing.getUniqueValue());
            return locations[name];
        }

        var location = new GlideRecord('cmn_location');
        location.initialize();
        location.setValue('name', name);
        locations[name] = String(location.insert());
        created.locations += 1;
        return locations[name];
    }

    function findExistingCi(table, name) {
        return findExistingByField(table, 'name', name);
    }

    function applyCommonCiFields(record, attributes) {
        setIfPresent(record, 'name', attributes.name);
        setIfPresent(record, 'short_description', attributes.short_description);
        setIfPresent(record, 'comments', attributes.comments);
        setIfPresent(record, 'operational_status', attributes.operational_status);
        setIfPresent(record, 'install_status', attributes.install_status || '1');
        setIfPresent(record, 'department', attributes.department);
        setIfPresent(record, 'location', attributes.location);
        setIfPresent(record, 'company', attributes.company);
        setIfPresent(record, 'owned_by', attributes.owned_by);
        setIfPresent(record, 'managed_by', attributes.managed_by);
        setIfPresent(record, 'support_group', attributes.support_group);
        setIfPresent(record, 'discovery_source', attributes.discovery_source || 'InfraNexus Demo Loader');
        setIfPresent(record, 'u_environment', attributes.environment);
        setIfPresent(record, 'environment', attributes.environment);
        setIfPresent(record, 'used_for', attributes.used_for);
        setIfPresent(record, 'fqdn', attributes.fqdn);
        setIfPresent(record, 'ip_address', attributes.ip_address);
        setIfPresent(record, 'host_name', attributes.host_name);
        setIfPresent(record, 'os', attributes.os);
        setIfPresent(record, 'version', attributes.version);
        setIfPresent(record, 'vendor', attributes.vendor);
        setIfPresent(record, 'asset_tag', attributes.asset_tag);
        setIfPresent(record, 'serial_number', attributes.serial_number);
        setIfPresent(record, 'cpu_count', attributes.cpu_count);
        setIfPresent(record, 'ram', attributes.ram);
        setIfPresent(record, 'dns_domain', attributes.dns_domain);
        setIfPresent(record, 'port', attributes.port);
        setIfPresent(record, 'url', attributes.url);
        setIfPresent(record, 'service_classification', attributes.service_classification);
    }

    function upsertCi(table, attributes) {
        if (!tableExists(table)) {
            created.skipped_tables += 1;
            warn('Skipping missing table: ' + table);
            return null;
        }

        var existing = findExistingCi(table, attributes.name);
        var record = existing || new GlideRecord(table);
        var isNew = !existing;

        if (isNew) {
            record.initialize();
        }

        applyCommonCiFields(record, attributes);

        if (isNew) {
            setSystemDatesIfPossible(record, attributes.created_at, attributes.updated_at || attributes.created_at);
            record.insert();
            created.cis += 1;
        } else {
            setSystemDatesIfPossible(record, attributes.created_at, attributes.updated_at || NOW);
            record.update();
        }

        return record;
    }

    function resolveRelationshipCandidate(candidate) {
        var relType = new GlideRecord('cmdb_rel_type');
        relType.addQuery('name', candidate);
        relType.setLimit(1);
        relType.query();
        if (relType.next()) {
            return String(relType.getUniqueValue());
        }

        relType = new GlideRecord('cmdb_rel_type');
        relType.addQuery('parent_descriptor', candidate);
        relType.addOrCondition('child_descriptor', candidate);
        relType.setLimit(1);
        relType.query();
        if (relType.next()) {
            return String(relType.getUniqueValue());
        }

        return '';
    }

    function resolveRelationshipByFragments(primaryFragment, secondaryFragment) {
        var relType = new GlideRecord('cmdb_rel_type');
        relType.addQuery('name', 'CONTAINS', primaryFragment);
        relType.addOrCondition('parent_descriptor', 'CONTAINS', primaryFragment);
        relType.addOrCondition('child_descriptor', 'CONTAINS', primaryFragment);
        relType.setLimit(25);
        relType.query();
        while (relType.next()) {
            var composite = [
                String(relType.getValue('name') || ''),
                String(relType.getValue('parent_descriptor') || ''),
                String(relType.getValue('child_descriptor') || '')
            ].join(' ');
            if (!secondaryFragment || composite.indexOf(secondaryFragment) !== -1) {
                return String(relType.getUniqueValue());
            }
        }
        return '';
    }

    function getRelationshipType(semantic) {
        if (relationshipCache[semantic]) {
            return relationshipCache[semantic];
        }

        var candidates = RELATION_CANDIDATES[semantic] || [];
        for (var index = 0; index < candidates.length; index += 1) {
            var resolved = resolveRelationshipCandidate(candidates[index]);
            if (resolved) {
                relationshipCache[semantic] = resolved;
                return resolved;
            }
        }

        var fragments = {
            depends_on: ['Depends', 'Used'],
            runs_on: ['Runs', 'on'],
            hosted_on: ['Hosted', 'Hosts'],
            contains: ['Contain', ''],
            members_of: ['Member', ''],
            connected_by: ['Connect', ''],
            cluster_of: ['Cluster', ''],
            provided_by: ['Provide', ''],
            sends_data_to: ['data', 'Receive']
        };
        var fallback = fragments[semantic];
        if (fallback) {
            var byFragments = resolveRelationshipByFragments(fallback[0], fallback[1]);
            if (byFragments) {
                relationshipCache[semantic] = byFragments;
                return byFragments;
            }
        }

        var generic = resolveRelationshipCandidate('Relates to::Related by') || resolveRelationshipByFragments('Relates', '');
        if (generic) {
            relationshipCache[semantic] = generic;
            return generic;
        }

        warn('No relation type found for semantic: ' + semantic);
        relationshipCache[semantic] = '';
        return '';
    }

    function ensureRelationship(parentSysId, childSysId, semantic) {
        var typeSysId = getRelationshipType(semantic);
        if (!parentSysId || !childSysId || !typeSysId) {
            return;
        }

        var rel = new GlideRecord('cmdb_rel_ci');
        rel.addQuery('parent', parentSysId);
        rel.addQuery('child', childSysId);
        rel.addQuery('type', typeSysId);
        rel.setLimit(1);
        rel.query();
        if (rel.next()) {
            return;
        }

        rel.initialize();
        rel.setValue('parent', parentSysId);
        rel.setValue('child', childSysId);
        rel.setValue('type', typeSysId);
        rel.insert();
        created.relationships += 1;
    }

    function getSysId(record) {
        return record ? String(record.getUniqueValue()) : '';
    }

    function createIncident(spec) {
        var existingIncident = new GlideRecord('incident');
        existingIncident.addQuery('short_description', spec.short_description);
        existingIncident.addQuery('cmdb_ci', spec.cmdb_ci);
        existingIncident.setLimit(1);
        existingIncident.query();
        if (existingIncident.next()) {
            return String(existingIncident.getUniqueValue());
        }

        var incident = new GlideRecord('incident');
        incident.initialize();
        setIfPresent(incident, 'short_description', spec.short_description);
        setIfPresent(incident, 'description', spec.description);
        setIfPresent(incident, 'cmdb_ci', spec.cmdb_ci);
        setIfPresent(incident, 'category', spec.category || 'software');
        setIfPresent(incident, 'subcategory', spec.subcategory || 'performance');
        setIfPresent(incident, 'impact', spec.impact || '2');
        setIfPresent(incident, 'urgency', spec.urgency || '2');
        setIfPresent(incident, 'priority', spec.priority || '2');
        setIfPresent(incident, 'contact_type', spec.contact_type || 'monitoring');

        if (incident.isValidField('incident_state')) {
            incident.setValue('incident_state', spec.state || '2');
        }
        if (incident.isValidField('state')) {
            incident.setValue('state', spec.state || '2');
        }
        if (spec.state === '6' || spec.state === '7') {
            setIfPresent(incident, 'close_code', spec.close_code || 'Solved (Permanently)');
            setIfPresent(incident, 'close_notes', spec.close_notes || 'Resolved by InfraNexus demo loader');
        }

        var openedAt = new GlideDateTime();
        openedAt.addDaysUTC(-Math.abs(spec.daysAgo || 1));
        setDateIfPossible(incident, 'opened_at', openedAt);
        if (spec.state === '6' || spec.state === '7') {
            setDateIfPossible(incident, 'resolved_at', openedAt);
            setDateIfPossible(incident, 'closed_at', openedAt);
        }
        setSystemDatesIfPossible(incident, openedAt, openedAt);

        var insertedId = incident.insert();
        created.incidents += 1;
        return String(insertedId);
    }

    function createAuditTrail(ciRecord, label) {
        if (!ciRecord) {
            return;
        }

        var snapshots = [
            { operational_status: '1', comments: label + ' - initial onboarding' },
            { operational_status: '3', comments: label + ' - repair window in progress' },
            { operational_status: '2', comments: label + ' - non-operational event captured' },
            { operational_status: '1', comments: label + ' - service restored and verified' }
        ];

        for (var index = 0; index < snapshots.length; index += 1) {
            var updateRecord = new GlideRecord(ciRecord.getTableName());
            if (!updateRecord.get(ciRecord.getUniqueValue())) {
                continue;
            }
            setIfPresent(updateRecord, 'operational_status', snapshots[index].operational_status);
            setIfPresent(updateRecord, 'comments', snapshots[index].comments);
            updateRecord.update();
            created.updates += 1;
        }
    }

    function buildCiSpec(table, kind, label, departmentName, environment, locationName, index, extra) {
        var ordinal = nextCounter(kind);
        var baseNumber = 20 + ordinal;
        var status = pick(OPERATIONAL_STATUSES, ordinal - 1);
        var name = ciName(kind, label, departmentName, environment, ordinal);
        var common = {
            name: name,
            short_description: label + ' for ' + departmentName + ' in ' + environment + ' environment',
            comments: 'Seeded by InfraNexus demo loader for ' + departmentName,
            environment: environment,
            operational_status: status,
            install_status: status === '4' ? '7' : '1',
            department: ensureDepartment(departmentName),
            location: ensureLocation(locationName),
            created_at: START_OF_LAST_WEEK,
            updated_at: NOW,
            discovery_source: 'InfraNexus Demo Loader',
            asset_tag: 'INX-' + kind.toUpperCase() + '-' + suffix(ordinal - 1),
            serial_number: 'SN-' + kind.toUpperCase() + '-' + suffix(ordinal - 1)
        };

        if (!extra) {
            return common;
        }

        for (var key in extra) {
            if (extra.hasOwnProperty(key)) {
                common[key] = extra[key];
            }
        }
        return common;
    }

    function createCi(table, kind, label, departmentName, environment, locationName, index, extra) {
        return upsertCi(
            table,
            buildCiSpec(table, kind, label, departmentName, environment, locationName, index, extra)
        );
    }

    log('Creating or reusing departments and locations');
    for (var depIndex = 0; depIndex < DEPARTMENT_NAMES.length; depIndex += 1) {
        ensureDepartment(DEPARTMENT_NAMES[depIndex]);
    }
    for (var locationIndex = 0; locationIndex < LOCATION_NAMES.length; locationIndex += 1) {
        ensureLocation(LOCATION_NAMES[locationIndex]);
    }

    log('Creating or reusing demo CIs across multiple classes');

    var nodes = {
        services: [],
        applications: [],
        databases: [],
        servers: [],
        vms: [],
        clusters: [],
        containers: [],
        k8sClusters: [],
        loadBalancers: [],
        switches: [],
        routers: []
    };

    for (var topologyIndex = 0; topologyIndex < 6; topologyIndex += 1) {
        var departmentName = pick(DEPARTMENT_NAMES, topologyIndex);
        var environment = pick(ENVIRONMENTS, topologyIndex);
        var locationName = pick(LOCATION_NAMES, topologyIndex);
        var networkSuffix = suffix(topologyIndex);

        nodes.services.push(
            createCi('cmdb_ci_service', 'service', 'Business Service', departmentName, environment, locationName, topologyIndex, {
                service_classification: environment === 'production' ? 'Business Critical' : 'Departmental',
                used_for: 'Cross-team service dependency mapping'
            })
        );

        nodes.applications.push(
            createCi('cmdb_ci_appl', 'application', 'Application', departmentName, environment, locationName, topologyIndex, {
                version: '2026.' + String(topologyIndex + 1),
                used_for: 'Application topology visualization'
            })
        );

        nodes.databases.push(
            createCi('cmdb_ci_database', 'database', 'Database', departmentName, environment, locationName, topologyIndex, {
                version: 'PostgreSQL 16.' + topologyIndex,
                port: String(5432 + topologyIndex)
            })
        );

        nodes.servers.push(
            createCi('cmdb_ci_server', 'server', 'Server', departmentName, environment, locationName, topologyIndex, {
                host_name: 'inx-' + environment + '-srv-' + networkSuffix.toLowerCase(),
                fqdn: 'inx-' + environment + '-srv-' + networkSuffix.toLowerCase() + '.demo.internal',
                dns_domain: 'demo.internal',
                ip_address: '10.42.' + String(topologyIndex + 10) + '.' + String(20 + topologyIndex),
                os: topologyIndex % 2 === 0 ? 'Linux' : 'Windows Server',
                cpu_count: String(4 + topologyIndex),
                ram: String(16 + topologyIndex * 8)
            })
        );

        nodes.vms.push(
            createCi('cmdb_ci_vm_instance', 'vm', 'VM Instance', departmentName, environment, locationName, topologyIndex, {
                host_name: 'inx-' + environment + '-vm-' + networkSuffix.toLowerCase(),
                fqdn: 'inx-' + environment + '-vm-' + networkSuffix.toLowerCase() + '.demo.internal',
                ip_address: '10.52.' + String(topologyIndex + 10) + '.' + String(30 + topologyIndex),
                os: topologyIndex % 2 === 0 ? 'Ubuntu 24.04' : 'RHEL 9'
            })
        );

        nodes.clusters.push(
            createCi('cmdb_ci_cluster', 'cluster', 'Cluster', departmentName, environment, locationName, topologyIndex, {
                version: 'Cluster Fabric ' + String(topologyIndex + 1)
            })
        );

        nodes.containers.push(
            createCi('cmdb_ci_container', 'container', 'Container', departmentName, environment, locationName, topologyIndex, {
                version: 'container-' + String(topologyIndex + 1),
                url: 'registry.demo.internal/' + environment + '/service-' + networkSuffix.toLowerCase()
            })
        );

        nodes.k8sClusters.push(
            createCi('cmdb_ci_kubernetes_cluster', 'k8s', 'Kubernetes Cluster', departmentName, environment, locationName, topologyIndex, {
                version: '1.31.' + topologyIndex,
                url: 'https://k8s-' + environment + '-' + networkSuffix.toLowerCase() + '.demo.internal'
            })
        );

        nodes.loadBalancers.push(
            createCi('cmdb_ci_lb', 'lb', 'Load Balancer', departmentName, environment, locationName, topologyIndex, {
                fqdn: 'inx-' + environment + '-lb-' + networkSuffix.toLowerCase() + '.demo.internal',
                ip_address: '10.62.' + String(topologyIndex + 10) + '.' + String(40 + topologyIndex),
                url: 'https://inx-' + environment + '-lb-' + networkSuffix.toLowerCase() + '.demo.internal'
            })
        );

        nodes.switches.push(
            createCi('cmdb_ci_ip_switch', 'switch', 'IP Switch', departmentName, environment, locationName, topologyIndex, {
                host_name: 'inx-' + environment + '-sw-' + networkSuffix.toLowerCase(),
                ip_address: '10.72.' + String(topologyIndex + 10) + '.' + String(50 + topologyIndex),
                vendor: 'Cisco'
            })
        );

        nodes.routers.push(
            createCi('cmdb_ci_ip_router', 'router', 'IP Router', departmentName, environment, locationName, topologyIndex, {
                host_name: 'inx-' + environment + '-rt-' + networkSuffix.toLowerCase(),
                ip_address: '10.82.' + String(topologyIndex + 10) + '.' + String(60 + topologyIndex),
                vendor: 'Juniper'
            })
        );
    }

    log('Creating directed CMDB relationships');

    for (var edgeIndex = 0; edgeIndex < nodes.services.length; edgeIndex += 1) {
        var service = nodes.services[edgeIndex];
        var app = nodes.applications[edgeIndex];
        var database = nodes.databases[edgeIndex];
        var server = nodes.servers[edgeIndex];
        var vm = nodes.vms[edgeIndex];
        var cluster = nodes.clusters[edgeIndex];
        var container = nodes.containers[edgeIndex];
        var k8s = nodes.k8sClusters[edgeIndex];
        var lb = nodes.loadBalancers[edgeIndex];
        var sw = nodes.switches[edgeIndex];
        var router = nodes.routers[edgeIndex];

        ensureRelationship(getSysId(service), getSysId(app), 'depends_on');
        ensureRelationship(getSysId(service), getSysId(lb), 'provided_by');
        ensureRelationship(getSysId(app), getSysId(database), 'depends_on');
        ensureRelationship(getSysId(app), getSysId(vm), 'runs_on');
        ensureRelationship(getSysId(vm), getSysId(server), 'hosted_on');
        ensureRelationship(getSysId(database), getSysId(server), 'hosted_on');
        ensureRelationship(getSysId(cluster), getSysId(vm), 'contains');
        ensureRelationship(getSysId(k8s), getSysId(container), 'contains');
        ensureRelationship(getSysId(container), getSysId(app), 'provided_by');
        ensureRelationship(getSysId(k8s), getSysId(cluster), 'cluster_of');
        ensureRelationship(getSysId(sw), getSysId(server), 'connected_by');
        ensureRelationship(getSysId(router), getSysId(sw), 'connected_by');
        ensureRelationship(getSysId(lb), getSysId(sw), 'connected_by');
        ensureRelationship(getSysId(cluster), getSysId(server), 'members_of');
        ensureRelationship(getSysId(app), getSysId(service), 'sends_data_to');
    }

    log('Creating incidents without closed-state data policy violations');

    var incidentTargets = [
        { ci: nodes.applications[0], state: '2', short_description: PREFIX + ' application latency regression', daysAgo: 6 },
        { ci: nodes.databases[1], state: '3', short_description: PREFIX + ' database replication lag', daysAgo: 5 },
        { ci: nodes.servers[2], state: '6', short_description: PREFIX + ' compute saturation resolved', daysAgo: 4 },
        { ci: nodes.loadBalancers[3], state: '7', short_description: PREFIX + ' edge pool rotation completed', daysAgo: 3 },
        { ci: nodes.k8sClusters[4], state: '2', short_description: PREFIX + ' cluster pod disruption alert', daysAgo: 2 },
        { ci: nodes.routers[5], state: '6', short_description: PREFIX + ' route convergence event cleared', daysAgo: 1 }
    ];

    for (var incidentIndex = 0; incidentIndex < incidentTargets.length; incidentIndex += 1) {
        var incidentSpec = incidentTargets[incidentIndex];
        if (!incidentSpec.ci) {
            continue;
        }
        createIncident({
            cmdb_ci: getSysId(incidentSpec.ci),
            short_description: incidentSpec.short_description,
            description: incidentSpec.short_description + ' created by InfraNexus demo loader',
            state: incidentSpec.state,
            daysAgo: incidentSpec.daysAgo,
            close_code: 'Solved (Permanently)',
            close_notes: 'Closure fields populated by InfraNexus demo loader'
        });
    }

    log('Generating CI update history');
    createAuditTrail(nodes.applications[0], PREFIX + ' Application 01');
    createAuditTrail(nodes.servers[2], PREFIX + ' Server 03');
    createAuditTrail(nodes.databases[1], PREFIX + ' Database 02');
    createAuditTrail(nodes.k8sClusters[4], PREFIX + ' Kubernetes Cluster 05');

    log('Demo load complete');
    log('Created departments: ' + created.departments);
    log('Created locations: ' + created.locations);
    log('Created CIs: ' + created.cis);
    log('Created relationships: ' + created.relationships);
    log('Created incidents: ' + created.incidents);
    log('Created CI updates: ' + created.updates);
    log('Skipped missing CI tables: ' + created.skipped_tables);
})();
