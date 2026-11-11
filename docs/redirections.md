# Plan de redirection depuis Wix

| Ancienne URL Wix | Nouvelle URL |
|---|---|
| `/` | `/` |
| `/la-kinésiologie` | `/kinesiologie` |
| `/kinésiologie` | `/memoires-transgenerationnelles` |
| `/kinésiologieanimale` | `/kinesiologie-animale` |
| `/soinsénergétiques` | `/soins-energetiques` |
| `/drainage` | `/drainage-lymphatique` |
| `/about-1-1` | `/drainage-lymphatique#jambes` |
| `/avis` | `/#temoignages` |
| `/contact-3` | `/contact` |

GitHub Pages ne sait pas émettre de vraies 301 : Astro génère pour chaque ancienne adresse une page de redirection instantanée (meta refresh + lien canonique), reconnue par Google. Si le domaine passe derrière Cloudflare, on pourra y ajouter de vraies règles 301.

Après la bascule : déclarer le nouveau `sitemap-index.xml` dans Google Search Console et mettre à jour le lien du site dans la fiche Google Business Profile.
