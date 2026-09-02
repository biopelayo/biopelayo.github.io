# PRODUCT.md · biopelayo.github.io

## What this is

Personal academic website of Pelayo González de Lena Rodríguez (@biopelayo, "Pelamovic"): PhD candidate in computational biology at the University of Oviedo. Research stay at the CNIO Computational Cancer Genomics Group from November 2020 to May 2023 (no current affiliation there). Single-page site hosted on GitHub Pages, hand-written HTML/CSS/JS, no frameworks, no build step.

## Audience and job

1. Recruiters and PIs (industry and academia) checking who Pelayo is before an interview or a collaboration. They need role, institutions, flagship projects, publications and contact in under a minute.
2. Researchers landing from EpiProfile-PLANTS or K-CHOPORE repos who want the author's context.
3. Students from his courses (IAAP, Uniovi) looking for tutorials and Código Biológico.

Visitor mode: Read (understand and locate), with an Experience opening (the nucleosome canvas is the signature).

## Product truth (do not invent beyond this)

- PhD thesis: histone PTMs in *Arabidopsis thaliana*, FPI fellowship PRE2019-091395, Dept. of Organisms and Systems Biology, University of Oviedo. Defense expected autumn 2026.
- Flagship software: EpiProfile-PLANTS (MATLAB suite + Snakemake/Docker workflow + Dash dashboard; 220+ raw files / 123 GB across PXD046034, PXD046788, PXD014739) and K-CHOPORE (eight-stage Snakemake+Docker nanopore direct RNA-seq workflow orchestrating 15 open-source tools from one config file; MIT). Its repo is PRIVATE since July 2026, so the site links kchopore-anac017-drs instead.
- Publications: book chapter "RNA Sequencing Platforms and Bioinformatics Tools" (Springer 2026, DOI 10.1007/978-981-95-5183-5_2) and lncRNA clusterization in HNSCC (Clinical Epigenetics 2017, DOI 10.1186/s13148-017-0334-6).
- Teaching: IAAP, University of Oviedo, Oviedo City Council, FORMACAL, ARTEAULA. Outreach: Código Biológico (YouTube).
- Football (owner-verified 2026-08-23): Liga Asterov 2025/26 with San Claudio: 20 goals in 21 matches, 9th top scorer of the First Division; Copa Asterov 2026 with Laviana CF: 2 goals in 4 matches.
- Contact (two addresses, both shown): bio.pelayo@gmail.com (personal, durable) and uo172378@uniovi.es (institutional) · GitHub biopelayo · ORCID 0000-0001-9409-1457 · X @biopelayo · ResearchGate.
- Experience (from the owner's CV, all verified 2026-09-02): eprObes research contract (Horizon Europe GA 101080219, CINN-CSIC, Sep 2025 to Sep 2026, the CURRENT post); FPI Severo Ochoa fellow at the University of Oviedo; research stay at CNIO (Nov 2020 to May 2023, closed); instructor; GeoAI Analytics (Oct 2019 to Nov 2020); Vivia Biotech (Jun to Oct 2019); ICM / Atrys Health; CIEMAT trainee.
  UNRESOLVED: the CV gives two end dates for the FPI contract, Sep 2026 under Experience and May 2025 under Funding. The site shows Sep 2026. Ask the owner before citing it anywhere else.
- Education (from the owner's CV, shipped 2026-08-23): PhD in Biology in progress (Uniovi, defence expected autumn 2026); MSc Bioinformatics and Computational Biology (Carlos III Health Institute, 2017); MSc Biomolecules and Cell Dynamics (UAM, 2016); BSc+MSc in Biology, 5-year degree (Uniovi, 2011).

## Brand commitments (pinned by the owner, 2026-08-23 intake)

- The mouse-reactive nucleosome canvas is the signature and must stay, but the owner LIFTED the "keep it verbatim" pin on 2026-08-26: he asked for a more realistic, more alive rendering (real nucleosome geometry, living-cell feel). The histone colour identity stays fixed: H2A rgb(52,217,110), H2B rgb(34,211,238), H3 rgb(94,170,255), H4 rgb(244,114,182), DNA rgb(100,170,255).
- Dual theme: dark default (deep blue #0f1520 ground, dominant green accent #34d96e, other neons reserved for the canvas); light theme on Pelamovic visual system (white ground, Botanical Green #2D6A4F, greens #52B788/#95D5B2/#D8F3DC). In light, the canvas lives only inside the dark hero.
- Layout: CV-style single page in the manner of driessmit.github.io: fixed side nav with circular profile photo, flat scannable sections, compact resume items. Content-dense material lives in outbound links.
- Faces: Bebas Neue (display), Work Sans (body), JetBrains Mono (code/data only).
- Bilingual EN/ES: English is the base content in HTML; Spanish applied client-side via data-i18n dictionary; preference persisted.
- Weight: "lite" is a goal: thumbnails instead of full-size figures, no floating alert sidebars, no embedded mega-directories.

## Constraints

- GitHub Pages static hosting; must work from file:// too (no fetch of local JSON).
- No build step, no framework; three files: index.html, css/styles.css, js/*.js.
- The default branch is `main` (there is no `master`). v2 is published from `main` to GitHub Pages; `tools/linkedin_add.py` pushes there too.
