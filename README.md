# SF History Walks (prototype)

A phone web app that shows lost buildings and stories near you in San Francisco, with a teaser, a link to the original story, and old photos. This version covers the Haight, Cole Valley, the Inner Sunset and a few Richmond stories.

## Folders

- `app/` is the whole site, all static files. This is what gets published.
- `app/data/stories.json` holds the stories. Each has a `status` of `draft` or `published`; only published ones show.
- `app/config.js` has the photo switch. Set `showPhotos` to false to stop loading photos from other sites. Adding `?photos=off` to the web address does the same for one visit.
- `tests/test.js` checks the helpers and every story. Run it with `node tests/test.js`.
- `pipeline/README.md` describes how stories will be found and added.
- `prototype/` keeps the earlier clickable mockup and first data set.

## Publishing on GitHub Pages

Every push to `main` runs the tests and, if they pass, publishes the `app/` folder. One setting is needed once: in the repository go to Settings, then Pages, and set Source to "GitHub Actions". The site address will be `https://davidhubert.github.io/sf-history-walks/`.

The site asks search engines not to list it (`robots.txt` and a noindex tag), but it is still a public address.

## Try it on a computer

From the `app/` folder run `python3 -m http.server 8000`, then open http://localhost:8000. Location works on localhost. On a phone it needs the https address above.

## Adding a story

Copy an entry in `app/data/stories.json`, change the fields and set `status` to `draft` while you check it. Keep the teaser in your own words (20 to 60 words) and always include the source link. Run `node tests/test.js`, then set `status` to `published`.

## Things to know

- Map tiles come from CARTO (based on OpenStreetMap), free for light non commercial use. Switch provider before sharing widely.
- Photos load directly from OpenSFHistory. Agree this with Western Neighborhoods Project before anyone else uses the app.
- Coordinates are approximate and need checking against old maps.
