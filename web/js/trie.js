const SCORE = { name: 100, alias: 90, tag: 70 };

/** Prefix trie over { id, name, aliases?, search_tags? } — beaches + habitat places. */
export class SearchTrie {
  constructor() {
    this.root = { children: {}, entries: [] };
    this.items = new Map();
  }

  load(entries = []) {
    this.root = { children: {}, entries: [] };
    this.items = new Map();

    for (const item of entries) {
      if (!item?.id) continue;
      this.items.set(item.id, item);
      const name = String(item.name || "").toLowerCase();
      if (name) this._insert(name, item.id, "name", name);

      for (const alias of item.aliases || []) {
        const a = String(alias).toLowerCase();
        if (a) this._insert(a, item.id, "alias", a);
      }

      for (const tag of item.search_tags || item.tags || []) {
        const t = String(tag).toLowerCase();
        if (t) this._insert(t, item.id, "tag", t);
      }
    }
  }

  _insert(term, id, kind, label) {
    let node = this.root;
    for (const ch of term) {
      if (!node.children[ch]) node.children[ch] = { children: {}, entries: [] };
      node = node.children[ch];
      node.entries.push({ id, kind, label, term });
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
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, limit)
      .map((r) => ({
        ...r.item,
        match: r.match,
        matchKind: r.kind,
      }));
  }

  _collect(node, prefix, seen) {
    for (const entry of node.entries) {
      if (!entry.label.startsWith(prefix)) continue;
      const item = this.items.get(entry.id);
      if (!item) continue;

      const score = SCORE[entry.kind] + entry.label.length;
      const prev = seen.get(entry.id);
      if (!prev || score > prev.score) {
        seen.set(entry.id, {
          item,
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

/** Beach search — same trie, beach-shaped index. */
export class CountryTrie {
  constructor() {
    this._trie = new SearchTrie();
  }

  load(index) {
    this._trie.load(index.beaches || []);
  }

  search(prefix, limit = 5) {
    return this._trie.search(prefix, limit);
  }
}
