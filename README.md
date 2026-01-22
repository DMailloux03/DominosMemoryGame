# DominosMemoryGame
Memory game for dominos employees on the makeline

## PWA build and install
Build the web version:

```bash
cd my-app
npm run build:web
```

The static files land in `my-app/dist-web`. You can host that folder on any static host.

Install on a phone:
- Android: open the site in Chrome, use the menu, then "Add to Home screen".
- iOS: open the site in Safari, tap Share, then "Add to Home Screen".

## GitHub Pages deploy
This repo includes a GitHub Actions workflow that builds and deploys `my-app/dist-web` to GitHub Pages on every push to `main`.

To enable:
- In GitHub, go to Settings > Pages.
- Set Source to "GitHub Actions".
