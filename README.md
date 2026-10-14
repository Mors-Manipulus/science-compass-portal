# Science Compass Portal

Build a new, production-ready website for BlackSeaShark Labs with a public-facing research website and a secure admin dashboard according to the attached specification (reference: https://blackseashark5labs.in/#/).

Key requirements:
1. Editorial dark research branding matching BlackSeaShark Labs (--bg-black: #05070a, --bg-dark: #0b0f17, --border: #1c2433, --accent-cyan: #00bcff, --accent-coral: #ff5d8f, Inter + JetBrains Mono).
2. The 6 actual research divisions:
   - BlackSeaShark5 AI (Reasoning, scaling & evaluation — Lead: Dr. Ada Reyes)
   - BlackSeaShark5 Quantum (Computing, sensing & cryptography — Lead: Dr. Igor Demidov)
   - BlackSeaShark5 Medical (Diagnostics, genomics & therapeutics — Lead: Dr. Hannah Berg)
   - BlackSeaShark5 Neuro / BCI (Neural interfaces & brain mapping — Lead: Dr. Nadia Hassan)
   - BlackSeaShark5 Robotics (Manipulation, locomotion & autonomy — Lead: Dr. Maria Voss)
   - BlackSeaShark5 Chip (Silicon, photonics & neuromorphic design — Lead: Dr. Pavel Novak)
3. Public pages: Home, Searchable Publications library with PDF view & download actions and division/year filters, Division detail pages, Researcher Directory (supporting 30+ profiles), Projects, News, and About/Contact.
4. Secure Admin Dashboard with Owner and Admin roles, publication management, multi-division assignment, PDF upload/replace/delete, researcher management, division management, and publication migration/import workflow with duplicate detection and preview.
5. High quality sample research papers, researchers, and projects pre-seeded so the site looks complete and functional immediately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://science-compass-portal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ebdbf90d-466d-4045-964d-3a3b66f00aa9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
