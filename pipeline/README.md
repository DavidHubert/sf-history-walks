# Story point pipeline (design, v0.1)

Turns published local history into map-ready story points: location, teaser, source link, old photos.

## Stages

1. Discover. Read feeds and sitemaps from approved sources (San Francisco Story, Western Neighborhoods Project, Richmond Sunset News, SFMTA History in Motion). Respect robots.txt and each site's terms; fetch slowly.
2. Extract. Claude reads each article and returns place mentions (intersections, addresses, named buildings), the time period, and whether it is a lost building, an event, or a layers story.
3. Geocode. Convert intersections and addresses to coordinates. Old street names and renumbering need a lookup table (for example the numbered avenues and Funston Avenue). Anything below high confidence goes to review.
4. Match photos. Search OpenSFHistory, SF Public Library, Calisphere and Bancroft by neighborhood, street and keywords. Store only metadata, credit and links unless the rights holder agrees otherwise.
5. Draft teaser. Claude writes a teaser of at most 45 words in its own words, never copying sentences from the source.
6. Review queue. A human approves each point (location, facts, photo credit). Nothing publishes unreviewed.
7. Publish. Write `data/story_points.json`, which the app reads.

## Rules

- Link to the original story on every card, with author and publisher shown.
- No copied article text; teasers only.
- Every photo carries a credit and a rights note; unknown rights means link out, not embed.
- Keep a `verification_notes` field for anything uncertain.

## Open items

- OpenSFHistory is building a new version (currently in private beta). Ask WNP about data access before building stage 4 against the old site.
