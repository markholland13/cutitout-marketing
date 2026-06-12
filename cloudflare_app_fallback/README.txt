Cloudflare Pages fallback site for app.cutitout.uk

Deploy the contents of this folder as a separate Cloudflare Pages project.

Recommended use:
1. Create a Pages project for this folder.
2. Attach the custom domain app.cutitout.uk to that Pages project.
3. Keep the _redirects file so every path under app.cutitout.uk serves this offline page.

What this does:
- /quote
- /cart
- /my-account
- any other app.cutitout.uk path

All routes resolve to the same branded holding page instead of an ngrok error screen.

Important:
This only works when app.cutitout.uk is pointed at this Pages project.
If app.cutitout.uk still points directly at ngrok, ngrok will keep showing its own offline error page whenever the tunnel is down.
