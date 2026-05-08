# CalcPilot — Landing Page

Marketing site for CalcPilot, an electrical engineering design platform
(voltage drop, single-line diagrams, cable sizing).

Deployed at **https://calcpilot.cc** via Cloudflare Pages.

## Stack

- Vite 5
- React 18
- Tailwind CSS 3
- framer-motion, lucide-react

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run preview  # preview the production build
```

## Deployment

This repository is connected to Cloudflare Pages. Every push to `main`
triggers an automatic build and deploy.

- Build command: `npm run build`
- Build output: `dist`
- Node version: 18

## License

Copyright (c) 2026. All rights reserved.
