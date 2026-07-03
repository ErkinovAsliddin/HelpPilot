// src/frontend/src/data/mockStats.ts
// SINGLE SOURCE OF TRUTH for all demo stats shown across pages.
// Welcome page, Burndown chart, Sidebar badges — ALL read from here.
// Do not hardcode numbers elsewhere.

export interface DemoStats {
  ticketsProcessed: number;
  autoResolved: number;
  autoResolveRate: number;       // 0–100 %
  avgResolutionSec: number;
  escalated: number;
  pending: number;
  openIncidents: number;
  solutionsLearned: number;
  costSaved: string;
  // Burndown timeline (for chart)
  burndownPoints: Array<{ label: string; total: number; aiResolved: number; backlog: number }>;
}

// These numbers are used consistently everywhere.
// Base values — the live demo loop increments from here.
export const DEMO_BASE: DemoStats = {
  ticketsProcessed: 1186,
  autoResolved:     1054,
  autoResolveRate:  89,
  avgResolutionSec: 18,
  escalated:        89,
  pending:          43,
  openIncidents:    7,
  solutionsLearned: 312,
  costSaved:        '$2,340.00',
  burndownPoints: [
    { label: '08:00', total: 0,    aiResolved: 0,   backlog: 0   },
    { label: '09:00', total: 120,  aiResolved: 98,  backlog: 22  },
    { label: '10:00', total: 280,  aiResolved: 243, backlog: 37  },
    { label: '11:00', total: 430,  aiResolved: 378, backlog: 52  },
    { label: '12:00', total: 560,  aiResolved: 497, backlog: 63  },
    { label: '13:00', total: 680,  aiResolved: 609, backlog: 71  },
    { label: '14:00', total: 810,  aiResolved: 724, backlog: 86  },
    { label: '15:00', total: 950,  aiResolved: 851, backlog: 99  },
    { label: '16:00', total: 1060, aiResolved: 946, backlog: 114 },
    { label: '17:00', total: 1186, aiResolved: 1054,backlog: 132 },
  ],
};

// Per-loop increment — the demo auto-increments each cycle
export const LOOP_INCREMENT = {
  ticketsProcessed: 3,
  autoResolved:     3,   // keeps rate at ~89%
  avgResolutionSec: -0,  // stays stable
};
