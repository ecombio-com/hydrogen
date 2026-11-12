#!/usr/bin/env python3
"""
catalog-merge.py - copy dev-only products into prod with everything attached:
images/videos, variants, costs, specs (metafields), the linked entries those specs
point to (metaobjects), their definitions, and the files those entries use.

ADDS ONLY. Never overwrites anything prod already has:
  - products already in prod are not re-created; they only get MISSING images and EMPTY spec fields filled
  - definitions / linked entries that already exist in prod are reused, not changed
  - new products arrive as DRAFT (archived stay archived)

Dev  = ecombio.myshopify.com   (CMS app, scripts/shopify/.cms.env)
Prod = khkkyb-b8.myshopify.com (ECOMBIOv2 app, Windows user env vars, else .env SHOPIFY_ADMIN_CLIENT_*)

Usage (from the Hydrogen folder):
  python scripts/shopify/catalog-merge.py                 # dry run: reads both stores, writes a plan, changes nothing
  python scripts/shopify/catalog-merge.py --apply --only some-handle   # apply to one product (test)
  python scripts/shopify/catalog-merge.py --apply --limit 40           # apply in batches (safe to re-run)
  python scripts/shopify/catalog-merge.py --verify        # compare dev vs prod for every merged product
Output: Shopify/Backups/catalog-merge/ (plan.json, apply-log.jsonl, verify.csv, caches)
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

VER = '2026-10'
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.abspath(os.path.join(REPO, '..', '..', 'Backups', 'catalog-merge'))
GID = re.compile(r'gid://shopify/([A-Za-z0-9]+)/\d+')
SKIP_MF = {('shopify', 'unavailable_reason')}          # system-managed
# app caches / legacy fields that must not be copied between stores (review apps refill them in prod)
SKIP_NS = {'judgeme', 'yotpo', 'reviews', 'global', 'mc-facebook'}
SKIP_TYPES = {'list.disclosure_reference', 'disclosure_reference'}
LATE_TYPES = {'product_reference', 'list.product_reference', 'variant_reference', 'list.variant_reference'}


def log(*a):
    print(*a, flush=True)


def read_env(path):
    d = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8-sig'):
            m = re.match(r'\s*([A-Za-z_]\w*)\s*=\s*(.*)', line)
            if m:
                d[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return d


class Store:
    def __init__(self, name, shop, cid, sec):
        if not cid or not sec:
            sys.exit(f'Missing client ID/secret for {shop}')
        self.name, self.shop = name, shop
        body = urllib.parse.urlencode({'grant_type': 'client_credentials', 'client_id': cid, 'client_secret': sec}).encode()
        req = urllib.request.Request(f'https://{shop}/admin/oauth/access_token', data=body)
        self.token = json.load(urllib.request.urlopen(req, timeout=30))['access_token']

    def q(self, query, variables=None):
        body = json.dumps({'query': query, 'variables': variables or {}}).encode()
        for attempt in range(10):
            req = urllib.request.Request(f'https://{self.shop}/admin/api/{VER}/graphql.json', data=body,
                                         headers={'X-Shopify-Access-Token': self.token, 'Content-Type': 'application/json'})
            try:
                r = json.load(urllib.request.urlopen(req, timeout=180))
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 + attempt * 2); continue
                raise RuntimeError(f'{self.name} HTTP {e.code}: {e.read()[:500]!r}')
            except (urllib.error.URLError, TimeoutError):
                time.sleep(3 + attempt); continue
            if r.get('errors'):
                if 'THROTTLED' in json.dumps(r['errors']):
                    time.sleep(3); continue
                raise RuntimeError(f"{self.name} GraphQL error: {json.dumps(r['errors'])[:1000]}")
            ts = r.get('extensions', {}).get('cost', {}).get('throttleStatus', {})
            if ts and ts.get('currentlyAvailable', 2000) < 400:
                time.sleep(2)
            return r['data']
        raise RuntimeError(f'{self.name}: gave up after retries')


def login():
    dev_env = read_env(os.path.join(HERE, '.cms.env'))
    repo_env = read_env(os.path.join(REPO, '.env'))
    pid = os.environ.get('SHOPIFY_ECOMBIOV2_CLIENT_ID') or repo_env.get('SHOPIFY_ADMIN_CLIENT_ID')
    psec = os.environ.get('SHOPIFY_ECOMBIOV2_CLIENT_SECRET') or repo_env.get('SHOPIFY_ADMIN_CLIENT_SECRET')
    dev = Store('dev', 'ecombio.myshopify.com', dev_env.get('CMS_CLIENT_ID'), dev_env.get('CMS_CLIENT_SECRET'))
    prod = Store('prod', 'khkkyb-b8.myshopify.com', pid, psec)
    return dev, prod


def paged(store, field, args, fields, size=50):
    out, after = [], None
    while True:
        d = store.q(f'query($after:String){{ {field}(first:{size}, after:$after{args}) {{ pageInfo {{ hasNextPage endCursor }} nodes {{ {fields} }} }} }}', {'after': after})[field]
        out += d['nodes']
        if not d['pageInfo']['hasNextPage']:
            return out
        after = d['pageInfo']['endCursor']


def jload(path, default):
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else default


def jsave(path, data):
    tmp = path + '.tmp'
    json.dump(data, open(tmp, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def fname(url):
    return re.sub(r'\?.*', '', (url or '').rsplit('/', 1)[-1])


# ---------------- read ----------------
PRODUCT_FIELDS = '''
 id handle title descriptionHtml vendor productType tags status templateSuffix
 category { id } seo { title description }
 options { name position optionValues { name } }
 media(first: 80) { nodes { alt mediaContentType
   ... on MediaImage { image { url } }
   ... on Video { originalSource { url } sources { url } }
   ... on ExternalVideo { originUrl }
   ... on Model3d { originalSource { url } } } }
 variants(first: 100) { nodes { sku barcode price compareAtPrice taxable inventoryPolicy
   selectedOptions { name value }
   media(first: 1) { nodes { ... on MediaImage { image { url } } } }
   inventoryItem { tracked requiresShipping unitCost { amount } measurement { weight { value unit } } } } }
 metafields(first: 100) { nodes { namespace key type value } }
'''


def fetch_dev_products(dev, refresh):
    path = os.path.join(OUT, 'dev-products.json')
    if not refresh and os.path.exists(path):
        return jload(path, [])
    log('Reading dev products...')
    items = paged(dev, 'products', '', PRODUCT_FIELDS, size=5)
    jsave(path, items)
    return items


NODE_FIELDS = '''__typename id
 ... on Metaobject { type handle capabilities { publishable { status } } fields { key type value } }
 ... on Product { handle }
 ... on Collection { handle }
 ... on Page { handle title body isPublished templateSuffix }
 ... on MediaImage { alt image { url } }
 ... on Video { alt originalSource { url } sources { url } }
 ... on GenericFile { alt url }'''


def resolve_dev_refs(dev, values):
    """Resolve every gid in the given values (recursively through metaobject fields)."""
    nodes, todo = {}, set()
    for v in values:
        todo |= {m.group(0) for m in GID.finditer(v or '')}
    while todo:
        batch = [g for g in todo if g not in nodes and not g.startswith('gid://shopify/TaxonomyValue') and not g.startswith('gid://shopify/TaxonomyCategory')]
        todo = set()
        for i in range(0, len(batch), 50):
            for n in dev.q(f'query($ids:[ID!]!){{ nodes(ids:$ids) {{ {NODE_FIELDS} }} }}', {'ids': batch[i:i + 50]})['nodes']:
                if not n:
                    continue
                nodes[n['id']] = n
                if n['__typename'] == 'Metaobject':
                    for f in n['fields']:
                        for m in GID.finditer(f['value'] or ''):
                            if m.group(0) not in nodes:
                                todo.add(m.group(0))
        for g in batch:
            nodes.setdefault(g, None)
    return nodes


MF_DEF_FIELDS = 'namespace key name description type { name } validations { name value } access { storefront }'
MO_DEF_FIELDS = '''id type name description displayNameKey access { storefront }
 capabilities { publishable { enabled } translatable { enabled } }
 fieldDefinitions { key name description required type { name } validations { name value } }'''


# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--refresh', action='store_true', help='re-read dev products instead of using the cache')
    ap.add_argument('--verify', action='store_true')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    dev, prod = login()
    log(f"Mode: {'APPLY' if a.apply else ('VERIFY' if a.verify else 'DRY RUN (no changes)')}")

    devp = fetch_dev_products(dev, a.refresh or a.apply is False)
    log(f'dev products: {len(devp)}')
    prod_handles = {p['handle']: p['id'] for p in paged(prod, 'products', '', 'id handle', size=250)}
    log(f'prod products: {len(prod_handles)}')

    if a.verify:
        return verify(dev, prod, devp, prod_handles)

    only = {h.strip() for h in a.only.split(',') if h.strip()}
    new = [p for p in devp if p['handle'] not in prod_handles]
    overlap = [p for p in devp if p['handle'] in prod_handles]
    if only:
        new = [p for p in new if p['handle'] in only]
        overlap = [p for p in overlap if p['handle'] in only]
    if a.limit:
        new = new[:a.limit]
    log(f'to create: {len(new)}   already in prod (fill gaps only): {len(overlap)}')
    targets = new + overlap

    # definitions
    dev_mf = {(d['namespace'], d['key']): d for d in paged(dev, 'metafieldDefinitions', ', ownerType: PRODUCT', MF_DEF_FIELDS, 250)}
    prod_mf = {(d['namespace'], d['key']): d for d in paged(prod, 'metafieldDefinitions', ', ownerType: PRODUCT', MF_DEF_FIELDS, 250)}
    dev_mo = {d['type']: d for d in paged(dev, 'metaobjectDefinitions', '', MO_DEF_FIELDS, 100)}
    dev_mo_by_id = {d['id']: d['type'] for d in dev_mo.values()}
    prod_mo = {d['type']: d['id'] for d in paged(prod, 'metaobjectDefinitions', '', 'id type', 250)}

    # which spec fields are used
    used = {}
    for p in targets:
        for m in p['metafields']['nodes']:
            k = (m['namespace'], m['key'])
            if k in SKIP_MF or m['namespace'] in SKIP_NS or m['type'] in SKIP_TYPES or m['namespace'].startswith('app--'):
                continue
            used[k] = m['type']

    # resolve every reference used by those products
    nodes = resolve_dev_refs(dev, [m['value'] for p in targets for m in p['metafields']['nodes'] if (m['namespace'], m['key']) in used])
    mos = {g: n for g, n in nodes.items() if n and n['__typename'] == 'Metaobject'}
    files = {g: n for g, n in nodes.items() if n and n['__typename'] in ('MediaImage', 'Video', 'GenericFile')}
    mo_types_needed = {n['type'] for n in mos.values()}

    # metaobject types referenced by definitions too (validation targets)
    def mo_targets(defn):
        ids = []
        for v in defn.get('validations', []):
            if v['name'] in ('metaobject_definition_id', 'metaobject_definition_ids'):
                ids += json.loads(v['value']) if v['value'].startswith('[') else [v['value']]
        return [dev_mo_by_id[i] for i in ids if i in dev_mo_by_id]

    for k in used:
        if k in dev_mf:
            mo_types_needed |= set(mo_targets(dev_mf[k]))
    # nested field validations
    changed = True
    while changed:
        changed = False
        for t in list(mo_types_needed):
            for fd in dev_mo.get(t, {}).get('fieldDefinitions', []):
                for tt in mo_targets(fd):
                    if tt not in mo_types_needed:
                        mo_types_needed.add(tt); changed = True

    missing_mo_types = sorted(t for t in mo_types_needed if t not in prod_mo)
    missing_mf = sorted(k for k in used if k not in prod_mf)

    # which entries prod lacks
    prod_entry = {}
    for g, n in mos.items():
        r = prod.q('query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id } }',
                   {'h': {'type': n['type'], 'handle': n['handle']}}) if n['type'] in prod_mo else {'metaobjectByHandle': None}
        if r['metaobjectByHandle']:
            prod_entry[g] = r['metaobjectByHandle']['id']
    missing_entries = [g for g in mos if g not in prod_entry]

    file_map = jload(os.path.join(OUT, 'file-map.json'), {})
    missing_files = [g for g in files if g not in file_map]

    # overlap gaps
    gaps = []
    for p in overlap:
        pp = prod.q('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id metafields(first:100){ nodes{ namespace key } } media(first:100){ nodes{ ... on MediaImage{ image{ url } } } } } }', {'h': p['handle']})['productByIdentifier']
        have_mf = {(m['namespace'], m['key']) for m in pp['metafields']['nodes']}
        have_img = {fname((m.get('image') or {}).get('url')) for m in pp['media']['nodes']}
        add_mf = [m for m in p['metafields']['nodes'] if (m['namespace'], m['key']) not in have_mf and (m['namespace'], m['key']) in used]
        add_img = [m for m in p['media']['nodes'] if m['mediaContentType'] == 'IMAGE' and fname(m['image']['url']) not in have_img]
        gaps.append({'handle': p['handle'], 'id': pp['id'], 'metafields': add_mf, 'images': add_img})

    plan = {
        'products_to_create': [{'handle': p['handle'], 'status': 'ARCHIVED' if p['status'] == 'ARCHIVED' else 'DRAFT',
                                'media': len(p['media']['nodes']), 'variants': len(p['variants']['nodes']),
                                'specs': len(p['metafields']['nodes'])} for p in new],
        'metaobject_definitions_to_create': missing_mo_types,
        'metafield_definitions_to_create': ['.'.join(k) for k in missing_mf],
        'linked_entries_to_create': sorted(f"{mos[g]['type']}/{mos[g]['handle']}" for g in missing_entries),
        'files_to_copy': len(missing_files),
        'existing_products_gap_fill': [{'handle': g['handle'], 'add_specs': ['.'.join((m['namespace'], m['key'])) for m in g['metafields']], 'add_images': len(g['images'])} for g in gaps],
    }
    jsave(os.path.join(OUT, 'plan.json'), plan)
    log('--- PLAN ---')
    log(f"products to create : {len(new)} (media {sum(x['media'] for x in plan['products_to_create'])}, variants {sum(x['variants'] for x in plan['products_to_create'])})")
    log(f"entry types to add : {len(missing_mo_types)} {missing_mo_types}")
    log(f"spec fields to add : {len(missing_mf)} {plan['metafield_definitions_to_create']}")
    log(f"linked entries     : {len(missing_entries)}")
    log(f"files to copy      : {len(missing_files)}")
    for g in plan['existing_products_gap_fill']:
        log(f"gap fill {g['handle']}: +{g['add_images']} images, +{len(g['add_specs'])} specs {g['add_specs']}")
    log(f'plan saved: {OUT}/plan.json')
    if not a.apply:
        log('Dry run only. Nothing changed.')
        return

    alog = open(os.path.join(OUT, 'apply-log.jsonl'), 'a', encoding='utf-8')

    def record(kind, key, ok, detail=''):
        alog.write(json.dumps({'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'kind': kind, 'key': key, 'ok': ok, 'detail': detail}, ensure_ascii=False) + '\n'); alog.flush()
        log(f"  {'OK ' if ok else 'ERR'} {kind} {key} {detail if not ok else ''}")

    # 1. metaobject definitions (standard ones via template, custom ones copied)
    pending = list(missing_mo_types)
    for _ in range(len(pending) + 1):
        for t in list(pending):
            d = dev_mo[t]
            if t.startswith('shopify--'):
                r = prod.q('mutation($t:String!){ standardMetaobjectDefinitionEnable(type:$t){ metaobjectDefinition{ id type } userErrors{ field message } } }', {'t': t})['standardMetaobjectDefinitionEnable']
            else:
                deps = [tt for fd in d['fieldDefinitions'] for tt in mo_targets(fd)]
                if any(tt not in prod_mo for tt in deps):
                    continue
                fds = []
                for fd in d['fieldDefinitions']:
                    vals = []
                    for v in fd['validations']:
                        if v['name'] in ('metaobject_definition_id', 'metaobject_definition_ids'):
                            ids = json.loads(v['value']) if v['value'].startswith('[') else [v['value']]
                            mapped = [prod_mo[dev_mo_by_id[i]] for i in ids if i in dev_mo_by_id]
                            vals.append({'name': v['name'], 'value': json.dumps(mapped) if v['value'].startswith('[') else mapped[0]})
                        else:
                            vals.append({'name': v['name'], 'value': v['value']})
                    fds.append({'key': fd['key'], 'name': fd['name'], 'description': fd['description'] or '', 'required': fd['required'], 'type': fd['type']['name'], 'validations': vals})
                inp = {'type': t, 'name': d['name'], 'description': d['description'] or '', 'displayNameKey': d['displayNameKey'],
                       'access': {'storefront': d['access']['storefront']}, 'fieldDefinitions': fds,
                       'capabilities': {'publishable': {'enabled': d['capabilities']['publishable']['enabled']}, 'translatable': {'enabled': d['capabilities']['translatable']['enabled']}}}
                r = prod.q('mutation($d:MetaobjectDefinitionCreateInput!){ metaobjectDefinitionCreate(definition:$d){ metaobjectDefinition{ id type } userErrors{ field message } } }', {'d': inp})['metaobjectDefinitionCreate']
            if r['metaobjectDefinition']:
                prod_mo[t] = r['metaobjectDefinition']['id']; record('entry-type', t, True)
            else:
                record('entry-type', t, False, json.dumps(r['userErrors']))
            pending.remove(t)

    # 2. spec field definitions
    for k in missing_mf:
        d = dev_mf.get(k)
        if not d:
            record('spec-field', '.'.join(k), True, 'no definition in dev either; values set as plain fields'); continue
        if k[0] == 'shopify':
            r = prod.q('mutation($n:String!,$k:String!){ standardMetafieldDefinitionEnable(ownerType: PRODUCT, namespace:$n, key:$k, pin:false){ createdDefinition{ id } userErrors{ field message } } }', {'n': k[0], 'k': k[1]})['standardMetafieldDefinitionEnable']
            ok = bool(r['createdDefinition'])
        else:
            vals = []
            for v in d['validations']:
                if v['name'] in ('metaobject_definition_id', 'metaobject_definition_ids'):
                    ids = json.loads(v['value']) if v['value'].startswith('[') else [v['value']]
                    mapped = [prod_mo[dev_mo_by_id[i]] for i in ids if i in dev_mo_by_id and dev_mo_by_id[i] in prod_mo]
                    if not mapped:
                        continue
                    vals.append({'name': v['name'], 'value': json.dumps(mapped) if v['value'].startswith('[') else mapped[0]})
                else:
                    vals.append({'name': v['name'], 'value': v['value']})
            inp = {'namespace': k[0], 'key': k[1], 'name': d['name'], 'description': d['description'] or '', 'type': d['type']['name'],
                   'ownerType': 'PRODUCT', 'validations': vals, 'access': {'storefront': d['access']['storefront']}}
            r = prod.q('mutation($d:MetafieldDefinitionInput!){ metafieldDefinitionCreate(definition:$d){ createdDefinition{ id } userErrors{ field message } } }', {'d': inp})['metafieldDefinitionCreate']
            ok = bool(r['createdDefinition'])
        record('spec-field', '.'.join(k), ok, '' if ok else json.dumps(r['userErrors']))

    # 3. files used by linked entries
    for g in missing_files:
        n = files[g]
        if n['__typename'] == 'MediaImage':
            srcs, ct = [(n.get('image') or {}).get('url')], 'IMAGE'
        elif n['__typename'] == 'Video':
            srcs, ct = [(n.get('originalSource') or {}).get('url')] + [x.get('url') for x in (n.get('sources') or [])], 'VIDEO'
        else:
            srcs, ct = [n.get('url')], 'FILE'
        srcs = [x for x in srcs if x]
        if not srcs:
            record('file', g, False, 'no source url in dev'); continue
        r = {'files': None, 'userErrors': []}
        for src in srcs:
            r = prod.q('mutation($f:[FileCreateInput!]!){ fileCreate(files:$f){ files{ id } userErrors{ field message } } }',
                       {'f': [{'originalSource': src, 'alt': n.get('alt') or '', 'contentType': ct}]})['fileCreate']
            if r['files']:
                break
        if r['files']:
            file_map[g] = r['files'][0]['id']; jsave(os.path.join(OUT, 'file-map.json'), file_map); record('file', fname(src), True)
        else:
            record('file', fname(src), False, json.dumps(r['userErrors']))

    # value mapper (dev gid -> prod gid)
    prod_prod = dict(prod_handles)
    page_map = {}

    def map_gid(g):
        n = nodes.get(g)
        if g.startswith('gid://shopify/Taxonomy'):
            return g
        if not n:
            return None
        t = n['__typename']
        if t == 'Metaobject':
            return prod_entry.get(g)
        if t in ('MediaImage', 'Video', 'GenericFile'):
            return file_map.get(g)
        if t == 'Product':
            return prod_prod.get(n['handle'])
        if t == 'Collection':
            r = prod.q('query($h:String!){ collectionByIdentifier(identifier:{handle:$h}){ id } }', {'h': n['handle']})
            return (r['collectionByIdentifier'] or {}).get('id')
        if t == 'Page':
            if g in page_map:
                return page_map[g]
            r = prod.q('query($q:String!){ pages(first:1, query:$q){ nodes{ id handle } } }', {'q': f"handle:{n['handle']}"})['pages']['nodes']
            if r and r[0]['handle'] == n['handle']:
                page_map[g] = r[0]['id']; return page_map[g]
            pg = {'title': n['title'], 'handle': n['handle'], 'body': n['body'] or '', 'isPublished': n['isPublished']}
            if n.get('templateSuffix'):
                pg['templateSuffix'] = n['templateSuffix']
            r = prod.q('mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id } userErrors{ field message } } }', {'p': pg})['pageCreate']
            if r['page']:
                page_map[g] = r['page']['id']; record('page', n['handle'], True); return page_map[g]
            record('page', n['handle'], False, json.dumps(r['userErrors'])); return None
        return None

    def map_value(value, mtype):
        if not value or not GID.search(value):
            return value
        if mtype.startswith('list.') and value.strip().startswith('['):
            arr = json.loads(value)
            out = [map_gid(x) if isinstance(x, str) and GID.fullmatch(x) else x for x in arr]
            out = [x for x in out if x]
            return json.dumps(out) if out else None
        if GID.fullmatch(value.strip()):
            return map_gid(value.strip())
        # rich text / json: replace inline, drop if anything unmapped
        bad = []
        def rep(m):
            v = map_gid(m.group(0))
            if not v:
                bad.append(m.group(0))
            return v or m.group(0)
        out = GID.sub(rep, value)
        return None if bad else out

    # 4. linked entries (dependencies first)
    pending = list(missing_entries)
    for _ in range(len(pending) + 1):
        progressed = False
        for g in list(pending):
            n = mos[g]
            deps = [m.group(0) for f in n['fields'] for m in GID.finditer(f['value'] or '') if nodes.get(m.group(0)) and nodes[m.group(0)]['__typename'] == 'Metaobject']
            if any(dg in pending and dg != g for dg in deps):
                continue
            if n['type'] not in prod_mo:
                record('entry', f"{n['type']}/{n['handle']}", False, 'entry type missing in prod'); pending.remove(g); continue
            fields = []
            for f in n['fields']:
                if f['value'] is None:
                    continue
                v = map_value(f['value'], f['type'])
                if v is not None:
                    fields.append({'key': f['key'], 'value': v})
            mo = {'fields': fields}
            pub = (n.get('capabilities') or {}).get('publishable')
            if pub and pub.get('status'):
                mo['capabilities'] = {'publishable': {'status': pub['status']}}
            r = prod.q('mutation($h:MetaobjectHandleInput!,$m:MetaobjectUpsertInput!){ metaobjectUpsert(handle:$h, metaobject:$m){ metaobject{ id } userErrors{ field message } } }',
                       {'h': {'type': n['type'], 'handle': n['handle']}, 'm': mo})['metaobjectUpsert']
            if r['metaobject']:
                prod_entry[g] = r['metaobject']['id']; record('entry', f"{n['type']}/{n['handle']}", True)
            else:
                record('entry', f"{n['type']}/{n['handle']}", False, json.dumps(r['userErrors']))
            pending.remove(g); progressed = True
        if not pending or not progressed:
            break
    for g in pending:
        record('entry', f"{mos[g]['type']}/{mos[g]['handle']}", False, 'circular dependency, not created')

    # 5. create products
    def mf_inputs(p, late):
        res = []
        for m in p['metafields']['nodes']:
            k = (m['namespace'], m['key'])
            if k not in used or (m['type'] in LATE_TYPES) != late:
                continue
            v = map_value(m['value'], m['type'])
            if v is None:
                record('spec-value', f"{p['handle']}:{'.'.join(k)}", False, 'reference not found in prod, skipped'); continue
            res.append({'namespace': k[0], 'key': k[1], 'type': m['type'], 'value': v})
        return res

    created = []
    for i, p in enumerate(new, 1):
        log(f"[{i}/{len(new)}] {p['handle']}")
        filesin, seen = [], set()
        for m in p['media']['nodes']:
            t = m['mediaContentType']
            if t == 'IMAGE':
                src, ct = m['image']['url'], 'IMAGE'
            elif t == 'VIDEO':
                src, ct = (m.get('originalSource') or {}).get('url') or ((m.get('sources') or [{}])[0]).get('url'), 'VIDEO'
            elif t == 'EXTERNAL_VIDEO':
                src, ct = m.get('originUrl'), 'EXTERNAL_VIDEO'
            else:
                src, ct = (m.get('originalSource') or {}).get('url'), 'MODEL_3D'
            if src and src not in seen:
                seen.add(src); filesin.append({'originalSource': src, 'alt': m.get('alt') or '', 'contentType': ct})
        variants = []
        for v in p['variants']['nodes']:
            ii = v['inventoryItem']
            item = {'tracked': ii['tracked'], 'requiresShipping': ii['requiresShipping']}
            if ii.get('unitCost'):
                item['cost'] = ii['unitCost']['amount']
            w = (ii.get('measurement') or {}).get('weight')
            if w:
                item['measurement'] = {'weight': {'value': w['value'], 'unit': w['unit']}}
            vi = {'optionValues': [{'optionName': so['name'], 'name': so['value']} for so in v['selectedOptions']],
                  'price': v['price'], 'taxable': v['taxable'], 'inventoryPolicy': v['inventoryPolicy'], 'inventoryItem': item}
            for f in ('compareAtPrice', 'sku', 'barcode'):
                if v.get(f):
                    vi[f] = v[f]
            vm = v['media']['nodes']
            if vm and vm[0].get('image') and vm[0]['image']['url'] in seen:
                vi['file'] = {'originalSource': vm[0]['image']['url'], 'contentType': 'IMAGE'}
            variants.append(vi)
        inp = {'handle': p['handle'], 'title': p['title'], 'descriptionHtml': p['descriptionHtml'], 'vendor': p['vendor'],
               'productType': p['productType'], 'tags': p['tags'], 'status': 'ARCHIVED' if p['status'] == 'ARCHIVED' else 'DRAFT',
               'productOptions': [{'name': o['name'], 'position': o['position'], 'values': [{'name': x['name']} for x in o['optionValues']]} for o in p['options']],
               'files': filesin, 'variants': variants, 'metafields': mf_inputs(p, late=False)}
        if p.get('category'):
            inp['category'] = p['category']['id']
        if p.get('templateSuffix'):
            inp['templateSuffix'] = p['templateSuffix']
        seo = {k: v for k, v in (p.get('seo') or {}).items() if v}
        if seo:
            inp['seo'] = seo
        r = prod.q('mutation($i:ProductSetInput!){ productSet(synchronous:true, input:$i){ product{ id handle } userErrors{ field message code } } }', {'i': inp})['productSet']
        if r['product']:
            prod_prod[p['handle']] = r['product']['id']; created.append(p); record('product', p['handle'], True)
        else:
            record('product', p['handle'], False, json.dumps(r['userErrors'])[:800])

    # 6. gap fill on products prod already had
    for g in gaps:
        if g['images']:
            media = [{'originalSource': m['image']['url'], 'alt': m.get('alt') or '', 'mediaContentType': 'IMAGE'} for m in g['images']]
            r = prod.q('mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){ productUpdate(product:$p, media:$m){ product{ id } userErrors{ field message } } }',
                       {'p': {'id': g['id']}, 'm': media})['productUpdate']
            record('add-images', f"{g['handle']} (+{len(media)})", not r['userErrors'], json.dumps(r['userErrors']))

    # 7. spec values that point at products (after all products exist) + gap-fill specs
    sets = []
    for p in created:
        for m in mf_inputs(p, late=True):
            sets.append(dict(m, ownerId=prod_prod[p['handle']], _h=p['handle']))
    for g in gaps:
        fake = {'handle': g['handle'], 'metafields': {'nodes': g['metafields']}}
        for late in (False, True):
            for m in mf_inputs(fake, late=late):
                sets.append(dict(m, ownerId=g['id'], _h=g['handle']))
    for i in range(0, len(sets), 25):
        chunk = sets[i:i + 25]
        r = prod.q('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id } userErrors{ field message } } }',
                   {'m': [{k: v for k, v in x.items() if k != '_h'} for x in chunk]})['metafieldsSet']
        record('specs', f'{len(chunk)} values', not r['userErrors'], json.dumps(r['userErrors'])[:800])
    log('Done. Run with --verify to compare dev vs prod.')


def verify(dev, prod, devp, prod_handles):
    rows = ['handle,status,dev_media,prod_media,dev_variants,prod_variants,dev_specs,prod_specs,result']
    bad = 0
    for p in devp:
        if p['handle'] not in prod_handles:
            continue
        pp = prod.q('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ status mediaCount{ count } variantsCount{ count } metafields(first:100){ nodes{ namespace key } } } }', {'h': p['handle']})['productByIdentifier']
        dm = len(p['media']['nodes']); pm = pp['mediaCount']['count']
        dv = len(p['variants']['nodes']); pv = pp['variantsCount']['count']
        ds = len([m for m in p['metafields']['nodes'] if (m['namespace'], m['key']) not in SKIP_MF and m['namespace'] not in SKIP_NS and m['type'] not in SKIP_TYPES])
        ps = len(pp['metafields']['nodes'])
        ok = pm >= dm and pv >= dv
        bad += not ok
        rows.append(f"{p['handle']},{pp['status']},{dm},{pm},{dv},{pv},{ds},{ps},{'OK' if ok else 'CHECK'}")
    open(os.path.join(OUT, 'verify.csv'), 'w', encoding='utf-8').write('\n'.join(rows))
    log(f'verified {len(rows) - 1} products, {bad} need a look -> {OUT}/verify.csv')


if __name__ == '__main__':
    main()
