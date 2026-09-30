"""Build the four task guides from one layout, without new dependencies."""
import html
import json
import re
from pathlib import Path
from string import Template
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content' / 'growth'
ORIGIN = 'https://cutitout.uk'

def build():
    # Reuse the established header/footer, rather than create a second design.
    reference = (ROOT / 'guides' / 'exporting-dxf' / 'index.html').read_text()
    header = re.search(r'<header\b.*?</header>', reference, re.S).group(0)
    footer = re.search(r'<footer\b.*?</footer>', reference, re.S).group(0)
    layout = Template((SOURCE / 'guide-template.html').read_text())
    pages = json.loads((SOURCE / 'pages.json').read_text())
    for page in pages:
        path = '/guides/' + page['slug'] + '/'
        url = ORIGIN + path
        body = (SOURCE / (page['slug'] + '.html')).read_text()
        sections = re.findall(r'<section\b[^>]*id="([^"]+)"[^>]*>\s*<h2[^>]*>(.*?)</h2>', body, re.S)
        contents = ''.join(f'<a href="#{sid}"><span aria-hidden="true">{i:02d}</span>{title}</a>' for i,(sid,title) in enumerate(sections,1))
        graph = [
            {'@type':'Organization','@id':ORIGIN+'/#organization','name':'Cut It Out','url':ORIGIN+'/', 'logo':ORIGIN+'/static/img/home/cut-it-out-white.svg'},
            {'@type':'WebPage','@id':url+'#webpage','url':url,'name':page['title'],'description':page['description'],'inLanguage':'en-GB'},
            {'@type':'Article','@id':url+'#article','headline':page['heading_text'],'description':page['description'],'mainEntityOfPage':{'@id':url+'#webpage'},'author':{'@id':ORIGIN+'/#organization'},'publisher':{'@id':ORIGIN+'/#organization'},'inLanguage':'en-GB','image':ORIGIN+'/static/img/home/hero-parts.webp'},
            {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i,'name':name,'item':item} for i,(name,item) in enumerate([('Home',ORIGIN+'/'),('Guides',ORIGIN+'/guides/'),(page['breadcrumb'],url)],1)]},
        ]
        values={k:html.escape(page[k],quote=True) for k in ['title','description','breadcrumb','intro','cta_label']}
        values.update(header=header,footer=footer,url=url,heading=page['heading'],body=body,contents=contents,first_section=sections[0][0],cta_url=page['cta_url'],schema=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False),tool_script='<script src="/static/js/dxf-scale.js?v=20260930-copy-2" defer></script>' if page.get('tool') else '')
        target=ROOT/path.strip('/')/'index.html'
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(layout.substitute(values))
    print(f'Built {len(pages)} guides using the existing site layout')
    # Do not recreate retired content. Use the same explicit mappings as the
    # host redirect file, with a browser fallback for static hosts lacking 301s.
    redirect_layout = Template((SOURCE / 'redirect-template.html').read_text())
    redirects = {}
    for line in (ROOT / '_redirects').read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        source, destination, status = line.split()
        assert status == '301' and '*' not in source
        slug = source.removesuffix('/index.html').strip('/')
        assert slug and not any(part == '..' for part in slug.split('/'))
        url = urljoin(ORIGIN, destination)
        assert urlsplit(url).netloc in ['cutitout.uk', 'app.cutitout.uk']
        assert redirects.get(slug, url) == url, 'Conflicting redirect mapping'
        redirects[slug] = url
    for slug, url in redirects.items():
        target = ROOT / slug / 'index.html'
        # Refuse to overwrite any actual page when a future mapping is added.
        if target.exists():
            assert '<meta http-equiv="refresh"' in target.read_text(), target
        target.parent.mkdir(parents=True, exist_ok=True)
        canonical = urlsplit(url)._replace(fragment='', query='').geturl()
        target.write_text(redirect_layout.substitute(destination=html.escape(url, quote=True), canonical=html.escape(canonical, quote=True)))
    print(f'Built {len(redirects)} small legacy redirect fallbacks (not HTTP 301 responses)')

if __name__=='__main__':
    build()
