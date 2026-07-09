const SCORE = { name: 100, alias: 90, tag: 70 };

export class CountryTrie {
  constructor() {
    this.root = { children: {}, entries: [] };
    this.beaches = new Map();
  }

  load(index) {
    this.root = { children: {}, entries: [] };
    this.beaches = new Map();

    for (const beach of index.beaches || []) {
      this.beaches.set(beach.id, beach);
      const name = beach.name.toLowerCase();
      this._insert(name, beach.id, "name", name);

      for (const alias of beach.aliases || []) {
        const a = alias.toLowerCase();
        this._insert(a, beach.id, "alias", a);
      }

      for (const tag of beach.search_tags || []) {
        const t = tag.toLowerCase();
        this._insert(t, beach.id, "tag", t);
      }
    }
  }

  _insert(term, beachId, kind, label) {
    let node = this.root;
    for (const ch of term) {
      if (!node.children[ch]) node.children[ch] = { children: {}, entries: [] };
      node = node.children[ch];
      node.entries.push({ beachId, kind, label, term });
    }
    node.terminal = true;
  }

  search(prefix, limit = 5) {
    const q = prefix.trim().toLowerCase();
    if (!q) return [];

    let node = this.root;
    for (const ch of q) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }

    const seen = new Map();
    this._collect(node, q, seen);

    return [...seen.values()]
      .sort((a, b) => b.score - a.score || a.beach.name.localeCompare(b.beach.name))
      .slice(0, limit)
      .map((r) => ({
        ...r.beach,
        match: r.match,
        matchKind: r.kind,
      }));
  }

  _collect(node, prefix, seen) {
    for (const entry of node.entries) {
      if (!entry.label.startsWith(prefix)) continue;
      const beach = this.beaches.get(entry.beachId);
      if (!beach) continue;

      const score = SCORE[entry.kind] + entry.label.length;
      const prev = seen.get(entry.beachId);
      if (!prev || score > prev.score) {
        seen.set(entry.beachId, {
          beach,
          score,
          kind: entry.kind,
          match: entry.label,
        });
      }
    }

    for (const child of Object.values(node.children)) {
      this._collect(child, prefix, seen);
    }
  }
}
