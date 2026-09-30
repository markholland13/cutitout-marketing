"""Check public sitemap pages and their local dependencies without network access."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://cutitout.uk'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.head = False
        self.in_title = False
        self.title = ''
        self.titles = 0
        self.h1 = 0
        self.ids = []
        self.links = []
        self.assets = []
        self.images = []
        self.meta = {}
        self.canonicals = []
        self.schemas = []
        self.schema_text = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'head':
            self.head = True
        if tag == 'title' and self.head:
            self.in_title = True
            self.titles += 1
        if tag == 'h1':
            self.h1 += 1
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'link':
            if a.get('rel') == 'canonical':
                self.canonicals.append(a.get('href'))
            elif a.get('rel') in ['stylesheet', 'icon', 'apple-touch-icon', 'preload']:
                self.assets.append(a.get('href', ''))
        if tag in ['script', 'img', 'source', 'video'] and a.get('src'):
            self.assets.append(a['src'])
        if tag == 'video' and a.get('poster'):
            self.assets.append(a['poster'])
        if tag == 'img':
            self.images.append(a)
        if a.get('srcset'):
            self.assets.extend(x.strip().split()[0] for x in a['srcset'].split(',') if x.strip())
        if tag == 'meta':
            self.meta[a.get('name', a.get('property', ''))] = a.get('content', '')
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.schema_text = ''

    def handle_endtag(self, tag):
        if tag == 'head':
            self.head = False
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.schema_text is not None:
            self.schemas.append(json.loads(self.schema_text))
            self.schema_text = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.schema_text is not None:
            self.schema_text += data


def local_file(url):
    path = ROOT / unquote(urlsplit(url).path).lstrip('/')
    if path.is_dir():
        path /= 'index.html'
    return path


def check():
    failures, warnings = [], []
    tree = ET.parse(ROOT / 'sitemap.xml')
    urls = [x.text for x in tree.findall('.//{*}loc')]
    pages, incoming = {}, Counter()
    if len(urls) != len(set(urls)):
        failures.append('Sitemap has duplicate URLs')
    for url in urls:
        parts = urlsplit(url)
        if parts.scheme + '://' + parts.netloc != ORIGIN or parts.query or parts.fragment or not parts.path.endswith('/'):
            failures.append(f'Non-canonical sitemap URL: {url}')
        path = local_file(url)
        if not path.is_file():
            failures.append(f'Missing sitemap page: {url}')
            continue
        try:
            pages[url] = Page(path.read_text())
        except (ValueError, json.JSONDecodeError) as exc:
            failures.append(f'{url}: invalid HTML/schema: {exc}')
    titles = Counter(p.title for p in pages.values())
    descriptions = Counter(p.meta.get('description') for p in pages.values())
    for url, page in pages.items():
        def fail(message):
            failures.append(f'{url}: {message}')
        if page.titles != 1 or not page.title.strip():
            fail('needs one non-empty HTML head title')
        if page.h1 != 1:
            fail(f'expected one H1, found {page.h1}')
        if page.canonicals != [url]:
            fail(f'canonical mismatch: {page.canonicals}')
        if not page.meta.get('description') or titles[page.title] > 1 or descriptions[page.meta.get('description')] > 1:
            fail('missing or duplicate title/description')
        if 'noindex' in page.meta.get('robots', '').lower():
            fail('sitemap page has noindex')
        for key in ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image', 'viewport']:
            if not page.meta.get(key):
                fail('missing ' + key)
        if page.meta.get('og:url') != url:
            fail('Open Graph URL differs from canonical')
        if len(page.ids) != len(set(page.ids)):
            fail('duplicate element IDs')
        for image in page.images:
            if 'alt' not in image or not image.get('width') or not image.get('height'):
                fail('image missing alt or explicit dimensions: ' + image.get('src', ''))
        for href in page.links:
            target = urljoin(url, href)
            parts = urlsplit(target)
            if parts.netloc == 'www.cutitout.uk':
                fail('internal link uses alternate www host: ' + href)
            if parts.netloc != 'cutitout.uk' or parts.scheme != 'https':
                continue
            file = local_file(target)
            if not file.is_file():
                fail('broken local link: ' + href)
                continue
            clean = parts._replace(query='', fragment='').geturl()
            if clean in pages and clean != url:
                incoming[clean] += 1
            if parts.fragment and file.suffix == '.html':
                dest = pages.get(clean) or Page(file.read_text())
                if unquote(parts.fragment) not in dest.ids:
                    fail('broken fragment: ' + href)
        for asset in page.assets + [page.meta.get('og:image', ''), page.meta.get('twitter:image', '')]:
            if not asset:
                continue
            target = urljoin(url, asset)
            if urlsplit(target).netloc == 'cutitout.uk' and not local_file(target).is_file():
                fail('missing asset: ' + asset)
        for schema in page.schemas:
            if schema.get('@context') != 'https://schema.org':
                fail('unexpected schema context')
            for node in schema.get('@graph', [schema]):
                kind = node.get('@type')
                if not kind:
                    fail('schema node missing type')
                if kind in ['Product', 'AggregateRating', 'Review', 'FAQPage']:
                    fail('schema needs separate evidence/eligibility review: ' + kind)
                if kind == 'WebPage' and node.get('url') != url:
                    fail('WebPage schema URL mismatch')
                if kind == 'BreadcrumbList':
                    items = node.get('itemListElement', [])
                    if [x.get('position') for x in items] != list(range(1, len(items) + 1)) or not items or items[-1].get('item') != url:
                        fail('invalid breadcrumb order/destination')
                for key in ['url', 'logo', 'image']:
                    value = node.get(key)
                    if isinstance(value, str) and value.startswith(ORIGIN + '/') and not local_file(value).is_file():
                        fail('schema references missing local URL: ' + value)
        if not page.schemas:
            warnings.append(f'{url}: no structured data (optional)')
    for url in pages:
        if url != ORIGIN + '/' and not incoming[url]:
            failures.append('Orphan sitemap page: ' + url)
    # Catch a public canonical page accidentally omitted from the sitemap.
    for path in ROOT.rglob('index.html'):
        if any(part in ['.git', 'content', 'docs', 'node_modules'] for part in path.relative_to(ROOT).parts):
            continue
        page = Page(path.read_text())
        for url in page.canonicals:
            if 'noindex' not in page.meta.get('robots', '').lower() and url not in pages:
                failures.append(f'{path.relative_to(ROOT)}: canonical page missing from sitemap')
    redirects = {}
    for line in (ROOT / '_redirects').read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        source, destination, _ = line.split()
        slug = source.removesuffix('/index.html').strip('/')
        redirects[slug] = urljoin(ORIGIN, destination)
    for slug, destination in redirects.items():
        file = ROOT / slug / 'index.html'
        if not file.is_file():
            failures.append('Missing legacy redirect fallback: ' + slug)
            continue
        text = file.read_text()
        page = Page(text)
        canonical = urlsplit(destination)._replace(query='', fragment='').geturl()
        if page.canonicals != [canonical] or page.links != [destination] or 'noindex' not in page.meta.get('robots', ''):
            failures.append('Incorrect redirect destination/indexability: ' + slug)
        refresh = re.search(r'<meta http-equiv="refresh" content="([^"]+)"', text)
        if not refresh or refresh[1] != '0;url=' + destination:
            failures.append('Invalid instant redirect: ' + slug)
        if urlsplit(destination).netloc == 'cutitout.uk':
            if not local_file(destination).is_file():
                failures.append('Broken redirect destination: ' + destination)
            fragment = urlsplit(destination).fragment
            if fragment and fragment not in Page(local_file(destination).read_text()).ids:
                failures.append('Broken redirect fragment: ' + destination)
    robots = (ROOT / 'robots.txt').read_text()
    if 'Sitemap: ' + ORIGIN + '/sitemap.xml' not in robots or re.search(r'^Disallow:\s*/\s*$', robots, re.M):
        failures.append('robots.txt blocks the site or has wrong sitemap')
    for line in warnings:
        print('NOTE:', line)
    for line in failures:
        print('FAIL:', line)
    print(f'Checked {len(pages)} public pages and {len(redirects)} legacy fallbacks: metadata, JSON-LD, sitemap, local links/fragments, images, assets and incoming links. {len(failures)} failures; {len(warnings)} optional schema notes.')
    return bool(failures)


if __name__ == '__main__':
    sys.exit(check())
