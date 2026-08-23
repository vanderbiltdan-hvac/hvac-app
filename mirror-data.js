// Platts Proposal Shared Mirror Data Engine
// Registry Version: v1.2.0
// Canonical source of shared Mirror data state for deployed app.

window.PLATTS_MIRROR_DATA = {
    currentJob: null,
    fields: {},
    schema: [],
    pmi: [],
    conflict: "",
    folderId: null,
    lastUpdated: null,

    baselineSchema: [
        "Date", "Customer Name", "Address", "Phone", "email", 
        "Reason for Call", "System #", "System Type",
        "Outdoor Model", "Outdoor Serial", "Indoor Model", 
        "Indoor Serial", "Furnace Model", "Furnace Serial", 
        "Refrigerant", "Metering Device", "Outdoor Tonnage", 
        "Indoor Tonnage", "Furnace BTU", "Heat Strips kW", 
        "Thermostat", "Filter Size", "Capacitor MFD", 
        "RLA", "RLA 2", "FLA ODF", "FLA ODF2", "FLA IDF", 
        "Target Subcool", "Belts", "System Description",
        "Access Code", "Customer Site Note"
    ],

    getActiveJob: function() {
        return localStorage.getItem('hvacActiveJob') || null;
    },

    getActiveSchema: function() {
        if (Array.isArray(this.schema) && this.schema.length > 0) {
            return this.schema;
        }
        return this.baselineSchema;
    },

    _normalizeLabel: function(label) {
        if (!label) return "";
        return label.trim().replace(/\s+/g, ' ').toLowerCase();
    },
    
    _normalizeSafePunctuation: function(label) {
        if (!label) return "";
        let s = label.replace(/[-_]/g, ' ');
        return this._normalizeLabel(s);
    },

    resolveFieldKey: function(label) {
        const resolution = this.resolveField(label);
        return resolution.canonicalLabel;
    },

    resolveField: function(label) {
        if (!label) return { requestedLabel: label, canonicalLabel: null, value: "", source: "none", resolved: false };
        
        const schema = this.getActiveSchema();
        const source = (schema === this.schema) ? "live" : "baseline";
        
        // 1. EXACT
        if (schema.includes(label)) {
            return { requestedLabel: label, canonicalLabel: label, value: this._getRawValue(label), source, resolved: true };
        }

        // 2. CASE-INSENSITIVE EXACT
        let lowerLabel = label.toLowerCase();
        let matches = schema.filter(k => k.toLowerCase() === lowerLabel);
        if (matches.length === 1) {
            return { requestedLabel: label, canonicalLabel: matches[0], value: this._getRawValue(matches[0]), source, resolved: true };
        }

        // 3. WHITESPACE-NORMALIZED EXACT
        let normLabel = this._normalizeLabel(label);
        matches = schema.filter(k => this._normalizeLabel(k) === normLabel);
        if (matches.length === 1) {
            return { requestedLabel: label, canonicalLabel: matches[0], value: this._getRawValue(matches[0]), source, resolved: true };
        }
        
        // 4. SAFE PUNCTUATION NORMALIZATION
        let safeLabel = this._normalizeSafePunctuation(label);
        matches = schema.filter(k => this._normalizeSafePunctuation(k) === safeLabel);
        if (matches.length === 1) {
            return { requestedLabel: label, canonicalLabel: matches[0], value: this._getRawValue(matches[0]), source, resolved: true };
        }

        return { requestedLabel: label, canonicalLabel: null, value: "", source: "none", resolved: false };
    },

    _getRawValue: function(canonicalLabel) {
        if (this.fields.hasOwnProperty(canonicalLabel)) {
            const val = this.fields[canonicalLabel];
            return (val !== undefined && val !== null) ? val : "";
        }
        return "";
    },

    getCanonicalLabel: function(label) {
        return this.resolveFieldKey(label);
    },

    getField: function(label) {
        const key = this.resolveFieldKey(label);
        if (!key) return null;
        if (this.fields.hasOwnProperty(key)) {
            const val = this.fields[key];
            return (val !== undefined && val !== null) ? val : "";
        }
        return "";
    },
    
    compareSchemaToBaseline: function() {
        const live = Array.isArray(this.schema) ? this.schema : [];
        const baseline = this.baselineSchema;
        
        let report = {
            liveOnly: [],
            baselineOnly: [],
            caseOrFormattingDifferences: []
        };
        
        if (live.length === 0) return report;
        
        let liveMap = live.map(k => ({ orig: k, norm: this._normalizeSafePunctuation(k) }));
        let baseMap = baseline.map(k => ({ orig: k, norm: this._normalizeSafePunctuation(k) }));
        
        for (let l of liveMap) {
            let matches = baseMap.filter(b => b.norm === l.norm);
            if (matches.length === 0) {
                report.liveOnly.push(l.orig);
            } else {
                let exactMatch = matches.find(b => b.orig === l.orig);
                if (!exactMatch) {
                    report.caseOrFormattingDifferences.push({ live: l.orig, baseline: matches[0].orig });
                }
            }
        }
        
        for (let b of baseMap) {
            let matches = liveMap.filter(l => l.norm === b.norm);
            if (matches.length === 0) {
                report.baselineOnly.push(b.orig);
            }
        }
        
        return report;
    },

    refresh: async function() {
        const activeJob = this.getActiveJob();
        if (!activeJob) {
            return {
                currentJob: null,
                fields: {},
                schema: [],
                pmi: [],
                conflict: "",
                folderId: null,
                lastUpdated: null,
                schemaDrift: { liveOnly: [], baselineOnly: [], caseOrFormattingDifferences: [] }
            };
        }

        this.currentJob = activeJob;
        const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby6cBAi3DIlnjOhOEdkYPGt5aijIl4jzOMLnhkxy8NXd6M33Tp9OZAzHezOMbINh-6n/exec";
        
        const payload = {
            action: "getJobData",
            sheetName: activeJob
        };

        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        
        const json = await response.json();

        if (json.status === "success" && json.data && !json.data.error && json.data.fields && Array.isArray(json.data.schema)) {
            this.fields = json.data.fields || {};
            this.schema = json.data.schema || [];
            this.pmi = json.data.pmi || [];
            this.conflict = json.data.conflict || "";
            this.folderId = json.data.folderId || null;
            this.lastUpdated = Date.now();

            if (this.folderId) {
                localStorage.setItem('hvacActiveFolderId', this.folderId);
            }
            
            const drift = this.compareSchemaToBaseline();

            const normalizedState = {
                currentJob: this.currentJob,
                fields: this.fields,
                schema: this.schema,
                pmi: this.pmi,
                conflict: this.conflict,
                folderId: this.folderId,
                lastUpdated: this.lastUpdated,
                schemaDrift: drift
            };

            window.dispatchEvent(
                new CustomEvent('platts-mirror-updated', {
                    detail: normalizedState
                })
            );

            return normalizedState;
        } else {
            throw new Error(json.data?.error || "Invalid response structure");
        }
    }
};
