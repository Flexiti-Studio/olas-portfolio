export type EaSubVersionType = 'normal' | 'break_even' | 'session_trading' | 'ranging' | 'liquidity';

export interface EaSubVersionConfig {
  id: EaSubVersionType;
  label: string;
  badgeLabel: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  activeRing: string;
}

export const EA_SUB_VERSIONS: Record<EaSubVersionType, EaSubVersionConfig> = {
  normal: {
    id: 'normal',
    label: 'Normal',
    badgeLabel: 'Normal',
    description: 'Standard / Base strategy rules without extra filtering',
    icon: 'tune',
    color: 'blue',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-800/60',
    textColor: 'text-blue-400',
    activeRing: 'ring-blue-500',
  },
  break_even: {
    id: 'break_even',
    label: 'Break Even',
    badgeLabel: 'Break Even',
    description: 'Automated breakeven stop loss adjustments (e.g. at 1R or target pips)',
    icon: 'shield_lock',
    color: 'emerald',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-800/60',
    textColor: 'text-emerald-400',
    activeRing: 'ring-emerald-500',
  },
  session_trading: {
    id: 'session_trading',
    label: 'Session Trading',
    badgeLabel: 'Session',
    description: 'Restricted to specific active trading sessions (London, NY Open)',
    icon: 'schedule',
    color: 'purple',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-800/60',
    textColor: 'text-purple-400',
    activeRing: 'ring-purple-500',
  },
  ranging: {
    id: 'ranging',
    label: 'Ranging',
    badgeLabel: 'Ranging',
    description: 'Range-bound & chop filters (ADX, Bollinger, consolidation boundary check)',
    icon: 'swap_horiz',
    color: 'amber',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-800/60',
    textColor: 'text-amber-400',
    activeRing: 'ring-amber-500',
  },
  liquidity: {
    id: 'liquidity',
    label: 'Liquidity',
    badgeLabel: 'Liquidity',
    description: 'Liquidity sweep, stop hunt, and institutional wick manipulation filters',
    icon: 'water_drop',
    color: 'cyan',
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-cyan-800/60',
    textColor: 'text-cyan-400',
    activeRing: 'ring-cyan-500',
  },
};

export const EA_SUB_VERSION_LIST: EaSubVersionConfig[] = Object.values(EA_SUB_VERSIONS);

/**
 * Detects the sub-version type from label and change notes.
 */
export function detectSubVersion(item: { label?: string; changeNotes?: string | null }): EaSubVersionType {
  const label = (item.label || '').toLowerCase();
  const notes = (item.changeNotes || '').toLowerCase();
  const combined = `${label} ${notes}`;

  // Check explicit serialized tag first
  if (combined.includes('[subversion:break_even]') || combined.includes('[subversion: break even]')) return 'break_even';
  if (combined.includes('[subversion:session_trading]') || combined.includes('[subversion: session trading]')) return 'session_trading';
  if (combined.includes('[subversion:ranging]')) return 'ranging';
  if (combined.includes('[subversion:liquidity]')) return 'liquidity';
  if (combined.includes('[subversion:normal]')) return 'normal';

  // Keyword heuristic detection
  if (label.includes('break even') || label.includes('breakeven') || label.includes('be-') || label.includes('-be') || label.includes('(be)') || notes.includes('breakeven') || notes.includes('break even')) {
    return 'break_even';
  }
  if (label.includes('session') || label.includes('london') || label.includes('ny open') || notes.includes('session trading') || notes.includes('session filter')) {
    return 'session_trading';
  }
  if (label.includes('ranging') || label.includes('range') || label.includes('chop') || notes.includes('ranging') || notes.includes('consolidation filter')) {
    return 'ranging';
  }
  if (label.includes('liquidity') || label.includes('sweep') || label.includes('stop hunt') || notes.includes('liquidity') || notes.includes('sweep filter')) {
    return 'liquidity';
  }

  return 'normal';
}

/**
 * Serializes sub-version and optional parent version tag into changeNotes cleanly.
 */
export function serializeSubVersionNotes(
  subVersion: EaSubVersionType,
  userNotes?: string | null,
  parentIdentifier?: string | null
): string {
  let cleanUserNotes = (userNotes || '')
    .replace(/\[subversion:\s*[\w_]+\]\s*/gi, '')
    .replace(/\[parent:\s*[^\]]+\]\s*/gi, '')
    .trim();

  const tags: string[] = [`[SubVersion: ${subVersion}]`];
  if (parentIdentifier && parentIdentifier.trim()) {
    tags.push(`[Parent: ${parentIdentifier.trim()}]`);
  }

  const tagString = tags.join(' ');
  if (!cleanUserNotes) return tagString;
  return `${tagString} ${cleanUserNotes}`;
}

/**
 * Strips out serialized [SubVersion: ...] and [Parent: ...] tags for clean presentation in UI notes.
 */
export function cleanSubVersionNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[subversion:\s*[\w_]+\]\s*/gi, '')
    .replace(/\[parent:\s*[^\]]+\]\s*/gi, '')
    .trim();
}

/**
 * Extracts explicit parent identifier from notes if present.
 */
export function extractParentIdentifier(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[parent:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

/**
 * Identifies the parent version of a given version, if any.
 */
export function findParentVersion<T extends { id: string; label: string; changeNotes?: string | null }>(
  item: T,
  allVersions: T[]
): T | null {
  // 1. Explicit [Parent: ...] tag in notes
  const explicitParent = extractParentIdentifier(item.changeNotes);
  if (explicitParent) {
    const parentByIdOrLabel = allVersions.find(
      (v) =>
        v.id !== item.id &&
        (v.id === explicitParent || v.label.toLowerCase() === explicitParent.toLowerCase())
    );
    if (parentByIdOrLabel) return parentByIdOrLabel;
  }

  // 2. Label prefix detection: e.g. "v3 - Break Even" -> "v3", "v1.1" -> "v1", "v2 (BE)" -> "v2"
  const itemLabel = item.label.trim();
  
  // Try matching against any existing version label as a prefix
  // Sort candidates by label length desc so longer labels match first (e.g. v10 before v1)
  const candidateParents = allVersions
    .filter((v) => v.id !== item.id)
    .sort((a, b) => b.label.length - a.label.length);

  for (const candidate of candidateParents) {
    const pLabel = candidate.label.trim();
    if (!pLabel) continue;

    // Matches "v3 - Something", "v3: Something", "v3 (Something)", "v3_Something"
    const prefixRegex = new RegExp(`^${escapeRegex(pLabel)}(\\s*[-–—:_(\\.].*|$)`, 'i');
    if (prefixRegex.test(itemLabel) && itemLabel.toLowerCase() !== pLabel.toLowerCase()) {
      return candidate;
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a version is a sub-version (either by parent connection or subversion type).
 */
export function isSubVersion<T extends { id: string; label: string; changeNotes?: string | null }>(
  item: T,
  allVersions: T[]
): boolean {
  return Boolean(findParentVersion(item, allVersions));
}

export interface VersionTreeNode<T> {
  version: T;
  subVersions: VersionTreeNode<T>[];
  parent: T | null;
  isSubVersion: boolean;
}

/**
 * Builds a hierarchical tree where subversions are nested under the version they were created from.
 */
export function buildVersionTree<T extends { id: string; label: string; changeNotes?: string | null }>(
  versions: T[]
): VersionTreeNode<T>[] {
  const nodeMap = new Map<string, VersionTreeNode<T>>();

  // Create node map
  versions.forEach((v) => {
    nodeMap.set(v.id, {
      version: v,
      subVersions: [],
      parent: null,
      isSubVersion: false,
    });
  });

  const roots: VersionTreeNode<T>[] = [];

  versions.forEach((v) => {
    const node = nodeMap.get(v.id)!;
    const parent = findParentVersion(v, versions);

    if (parent && nodeMap.has(parent.id)) {
      node.parent = parent;
      node.isSubVersion = true;
      nodeMap.get(parent.id)!.subVersions.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
