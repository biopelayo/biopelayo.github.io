# PRODUCT.md — biopelayo.github.io

## What this is

Personal academic website of Pelayo González de Lena Rodríguez (@biopelayo, "Pelamovic"): PhD candidate in computational biology at the University of Oviedo, affiliated with the Computational Cancer Genomics Group at CNIO since November 2020. Single-page site hosted on GitHub Pages, hand-written HTML/CSS/JS, no frameworks, no build step.

## Audience and job

1. Recruiters and PIs (industry and academia) checking who Pelayo is before an interview or a collaboration. They need role, institutions, flagship projects, publications and contact in under a minute.
2. Researchers landing from EpiProfile_PLANTS or K-CHOPORE repos who want the author's context.
3. Students from his courses (IAAP, Uniovi) looking for tutorials and Código Biológico.

Visitor mode: Read (understand and locate), with an Experience opening (the nucleosome canvas is the signature).

## Product truth (do not invent beyond this)

- PhD thesis: histone PTMs in *Arabidopsis thaliana*, FPI fellowship PRE2019-091395, Dept. of Organisms and Systems Biology, University of Oviedo. Defense expected autumn 2026.
- Flagship software: EpiProfile_PLANTS (MATLAB suite + Snakemake/Docker workflow + Dash dashboard; 220+ raw files / 123 GB across PXD046034, PXD046788, PXD014739) and K-CHOPORE (9-stage Snakemake+Docker nanopore direct RNA-seq pipeline; 20,958 isoforms, 435 DEGs by genotype, 266 by treatment).
- Publications: book chapter "RNA Sequencing Platforms and Bioinformatics Tools" (Springer 2026, DOI 10.1007/978-981-95-5183-5_2) and lncRNA clusterization in HNSCC (Clinical Epigenetics 2017, DOI 10.1186/s13148-017-0334-6).
- Teaching: IAAP, University of Oviedo, Oviedo City Council, FORMACAL, ARTEAULA. Outreach: Código Biológico (YouTube).
- Football: San Claudio, Liga Asterov 2025/26: 17 goals in 16 matches, #5 top scorer; team 11th of 14.
- Contact: pelayo.gonzalez@uniovi.es · GitHub biopelayo · ORCID 0000-0001-9409-1457 · X @biopelayo · ResearchGate.
- Education before the PhD is NOT documented on the site; do not fabricate degrees.

## Brand commitments (pinned by the owner, 2026-08-23 intake)

- Keep the nucleosome particle canvas (DNA strands + histone-colored nucleosome discs + dust + icon silhouettes, mouse-reactive) exactly as v1 authored it.
- Dual theme: dark default (deep blue #0f1520 ground, dominant green accent #34d96e, other neons reserved for the canvas); light theme on Pelamovic visual system (white ground, Botanical Green #2D6A4F, greens #52B788/#95D5B2/#D8F3DC). In light, the canvas lives only inside the dark hero.
- Layout: CV-style single page in the manner of driessmit.github.io: fixed side nav with circular profile photo, flat scannable sections, compact resume items. Content-dense material lives in outbound links.
- Faces: Bebas Neue (display), Work Sans (body), JetBrains Mono (code/data only).
- Bilingual EN/ES: English is the base content in HTML; Spanish applied client-side via data-i18n dictionary; preference persisted.
- Weight: "lite" is a goal: thumbnails instead of full-size figures, no floating alert sidebars, no embedded mega-directories.

## Constraints

- GitHub Pages static hosting; must work from file:// too (no fetch of local JSON).
- No build step, no framework; three files: index.html, css/styles.css, js/*.js.
- v1 lives on branch master; v2 is developed on branch v2-lite, local only until the owner approves.
