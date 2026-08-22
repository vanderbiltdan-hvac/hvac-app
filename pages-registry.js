// Platts Proposal Shared Pages Registry
// Registry Version: v1.0
// Canonical source of page availability for deployed app navigation.

window.PLATTS_PAGES_REGISTRY = [
    { name: "Splash", file: "index.html", state: "ACTIVE" },
    { name: "Quick Stash", file: location.protocol === 'file:' ? 'Splash.html#quickstash' : 'index.html#quickstash', state: "ACTIVE" },
    { name: "Notes", file: "notes.html", state: "ACTIVE" },
    { name: "Mirror", file: "mirror.html", state: "ACTIVE" },
    { name: "Specs", file: "specs.html", state: "ACTIVE" },
    { name: "PMI", file: "pmi.html", state: "ACTIVE" },
    { name: "Diag", file: "diagnostics.html", state: "ACTIVE" },
    { name: "Startup", file: "startup.html", state: "ACTIVE" },
    { name: "Compiler", file: "compiler.html", state: "ACTIVE" },
    { name: "Templates", file: "templates.html", state: "ACTIVE" },
    { name: "Reports", file: "reports.html", state: "PLANNED" },
    { name: "Data Block", file: "datablock.html", state: "PLANNED" }
];
