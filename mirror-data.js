// Platts Proposal Shared Mirror Data Engine
// Registry Version: v1.1.1
// Canonical source of shared Mirror data state for deployed app.

window.PLATTS_MIRROR_DATA = {
    currentJob: null,
    fields: {},
    schema: [],
    pmi: [],
    conflict: "",
    folderId: null,
    lastUpdated: null,

    getActiveJob: function() {
        return localStorage.getItem('hvacActiveJob') || null;
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
                lastUpdated: null
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

            const normalizedState = {
                currentJob: this.currentJob,
                fields: this.fields,
                schema: this.schema,
                pmi: this.pmi,
                conflict: this.conflict,
                folderId: this.folderId,
                lastUpdated: this.lastUpdated
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
    },

    resolveFieldKey: function(label) {
        if (!label) return null;
        
        // 1. exact key match
        if (this.fields.hasOwnProperty(label)) {
            return label;
        }

        const keys = Object.keys(this.fields);

        // 2. case-insensitive exact match
        const lowerLabel = label.toLowerCase();
        let match = keys.find(k => k.toLowerCase() === lowerLabel);
        if (match) return match;

        // 3. normalized match
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normLabel = normalize(label);
        match = keys.find(k => normalize(k) === normLabel);
        if (match) return match;

        // 4. known aliases
        const aliases = {
            "Customer Name": ["Customer Name", "customer name"],
            "Address": ["Address", "Service Address"],
            "Phone": ["Phone", "Phone Number"],
            "Email": ["Email", "email", "Email Address"],
            "Indoor Model": ["Indoor Model", "Air Handler Model", "Furnace Model"],
            "Indoor Serial": ["Indoor Serial"],
            "Indoor Tonnage": ["Indoor Tonnage"],
            "Filter Size": ["Filter Size"],
            "Metering Device": ["Metering Device"],
            "Outdoor Model": ["Outdoor Model", "Condenser Model"],
            "Outdoor Serial": ["Outdoor Serial"],
            "Outdoor Tonnage": ["Outdoor Tonnage"],
            "RLA": ["RLA", "Compressor RLA"],
            "FLA ODF": ["FLA ODF", "Fan Motor FLA"],
            "Refrigerant": ["Refrigerant", "Refrigerant Type"],
            "Date": ["Date"]
        };

        let targetCanonical = null;
        for (const [canon, aliasList] of Object.entries(aliases)) {
            if (aliasList.some(a => a.toLowerCase() === lowerLabel || normalize(a) === normLabel)) {
                targetCanonical = canon;
                break;
            }
        }

        if (targetCanonical) {
            const aliasList = aliases[targetCanonical] || [targetCanonical];
            for (const alias of aliasList) {
                if (this.fields.hasOwnProperty(alias)) {
                    return alias;
                }
                
                match = keys.find(k => k.toLowerCase() === alias.toLowerCase());
                if (match) return match;
                
                match = keys.find(k => normalize(k) === normalize(alias));
                if (match) return match;
            }
        }

        return null;
    },

    getField: function(label) {
        const key = this.resolveFieldKey(label);
        if (!key) return null;
        const val = this.fields[key];
        return (val !== undefined && val !== null) ? val : "";
    }
};
