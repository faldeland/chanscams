/**
 * Equipment inventory.
 * Daily rental rates set at roughly 3-5% of retail (industry standard for indie rental).
 * To add new gear: append to EQUIPMENT array and (optionally) extend CATEGORIES.
 *
 * Each item may include an `image` field (path relative to index.html) that the
 * catalog card and calendar modal will render. The starter images in
 * `images/products/` are royalty-free photos from Unsplash chosen to match each
 * category; swap them for real product shots by replacing the files (same name)
 * or by pointing `image` at any URL.
 */

const CATEGORIES = [
  { id: "all",      label: "All Gear" },
  { id: "camera",   label: "Cameras" },
  { id: "lens",     label: "Lenses" },
  { id: "mount",    label: "Mounts & Adapters" },
  { id: "rig",      label: "Rigs & Cages" },
  { id: "monitor",  label: "Monitors" },
  { id: "power",    label: "Power" },
  { id: "support",  label: "Tripods & Support" },
  { id: "media",    label: "Media & Storage" },
  { id: "filter",   label: "Filters" },
  { id: "case",     label: "Cases" },
];

const EQUIPMENT = [
  {
    id: "pyxis-12k",
    name: "Blackmagic Pyxis 12K",
    category: "camera",
    mount: "Leica L",
    retail: 5495,
    daily: 175,
    weeklyMultiplier: 4,
    image: "images/products/pyxis-12k.jpg",
    tagline: "12K full-frame cinema in a compact box",
    summary:
      "Full-frame 35.74×23.83mm sensor capturing native 12,288×8,040 12K RAW with Generation 5 Color Science and 16 stops of dynamic range. Built-in ND filters, dual CFexpress slots, and L-mount versatility for prime-set or stills-glass workflows.",
    specs: [
      "Full-frame 12K sensor (16 stops DR)",
      "Internal Blackmagic RAW + ProRes",
      "Built-in 2/4/6 stop ND filters",
      "Dual CFexpress Type B + USB-C SSD recording",
      "12G-SDI / HDMI 2.0 / Timecode / Genlock",
    ],
    badge: "Hero Camera",
    url: "https://www.bhphotovideo.com/c/product/1890646-REG/blackmagic_design_pyxis_12k_cinema_camera.html",
  },
  {
    id: "dzo-arles-prime-set",
    name: "DZO Arles FF/VV Prime Cine Set",
    category: "lens",
    mount: "PL",
    retail: 7999,
    daily: 295,
    weeklyMultiplier: 4,
    image: "images/products/dzo-arles-prime-set.jpg",
    tagline: "5-lens full-frame cine prime set in flight case",
    summary:
      "T1.4 vintage-toned full-frame primes with fast aperture, smooth focus throw, and consistent front diameter. Classic flare character with modern resolution. Includes 18mm, 25mm, 35mm, 50mm and 75mm in protective case.",
    specs: [
      "18 / 25 / 35 / 50 / 75 mm @ T1.4",
      "Full-frame / VistaVision coverage",
      "PL mount (use with our PL-to-L adapters)",
      "Unified front diameter & gear positions",
      "Hard flight case included",
    ],
    badge: "Set",
    url: "https://www.bhphotovideo.com/c/product/1829468-REG/dzofilm_dzo_sap5a25ipl_arles_ff_vv_prime_cine.html",
  },
  {
    id: "mofage-poco",
    name: "MOFAGE POCO Drop-In Filter Adapter",
    category: "mount",
    mount: "PL → Leica L",
    retail: 439,
    daily: 35,
    weeklyMultiplier: 4,
    image: "images/products/mofage-poco.jpg",
    tagline: "PL cinema glass on L-mount, with drop-in filters",
    summary:
      "Adapts PL-mount cinema lenses to Leica L bodies with a drop-in filter slot. Perfect for running our Arles primes on the Pyxis 12K with quick variable ND swaps.",
    specs: [
      "PL → L-mount adapter",
      "Drop-in filter slot",
      "Filter kit included",
      "Locking PL breech",
    ],
    url: "https://www.bhphotovideo.com/c/product/1775445-REG/mofage_s_l_poco_drop_in_filter_adapter.html",
  },
  {
    id: "dzo-octopus-pl-l",
    name: "DZOFilm Octopus Adapter",
    category: "mount",
    mount: "PL → Leica L",
    retail: 269,
    daily: 25,
    weeklyMultiplier: 4,
    image: "images/products/dzo-octopus-pl-l.jpg",
    tagline: "Slim, rock-solid PL-to-L mount",
    summary:
      "Pro-grade PL-to-L adapter with secure breech lock and accurate flange distance. A great backup or B-cam companion to the MOFAGE POCO.",
    specs: [
      "PL → L-mount",
      "Stainless steel breech",
      "Anti-reflective interior",
    ],
    url: "https://www.bhphotovideo.com/c/product/1608420-REG/dzofilm_dzo_adpllblk_octopus_adapter_pl_l.html",
  },
  {
    id: "tilta-pyxis-cage",
    name: "Tilta Camera Cage Pro Kit (Pyxis 6K/12K, V-Mount)",
    category: "rig",
    retail: 349,
    daily: 25,
    weeklyMultiplier: 4,
    image: "images/products/tilta-pyxis-cage.jpg",
    tagline: "Build-out cage tailored to the Pyxis",
    summary:
      "Full Pro kit with top handle, V-mount battery plate, side power distribution, and 15mm rod support. Turns the Pyxis into a shoulder- or studio-ready rig in minutes.",
    specs: [
      "V-mount battery plate w/ power distribution",
      "Quick-release top handle",
      "15mm LWS rod baseplate",
      "ARRI rosette + dovetail",
    ],
    url: "https://www.bhphotovideo.com/c/product/1864658-REG/tilta_es_t21_b_v_camera_cage_pro_kit.html",
  },
  {
    id: "portkeys-lh7p",
    name: "PORTKEYS LH7P 7\" High-Bright Monitor",
    category: "monitor",
    retail: 349,
    daily: 35,
    weeklyMultiplier: 4,
    image: "images/products/portkeys-lh7p.jpg",
    tagline: "Sunlight-readable on-camera monitor with cam control",
    summary:
      "2200-nit 7\" touchscreen with HDMI/SDI, full waveform/scopes, 3D LUT support, and built-in wireless camera control for popular cine bodies.",
    specs: [
      "7\" touchscreen, 2200 nits",
      "HDMI + 3G-SDI in/out",
      "Waveform, vectorscope, false color, focus peaking",
      "3D LUT loading",
      "Wireless camera control",
    ],
    url: "https://www.bhphotovideo.com/c/product/1764519-REG/portkeys_lh7pb_lh7p_7_high_brightness.html",
  },
  {
    id: "smallrig-f970-kit",
    name: "SmallRig NP-F970 Battery Kit (3× + Dual Charger)",
    category: "power",
    retail: 125,
    daily: 15,
    weeklyMultiplier: 4,
    image: "images/products/smallrig-f970-kit.jpg",
    tagline: "All-day power for monitors, lights, and accessories",
    summary:
      "Three 7800mAh L-series batteries with USB-C dual charger and built-in display. Powers most field monitors, on-camera lights, and small wireless systems.",
    specs: [
      "3× NP-F970 (7800 mAh)",
      "USB-C dual charger w/ display",
      "USB-A & USB-C output",
    ],
    url: "https://www.bhphotovideo.com/c/product/1884307-REG/smallrig_three_np_f970_l_series_batteries.html",
  },
  {
    id: "smallrig-magic-arm",
    name: "SmallRig Magic Arm with Dual Ball Heads",
    category: "support",
    retail: 29.99,
    daily: 8,
    weeklyMultiplier: 4,
    image: "images/products/smallrig-magic-arm.jpg",
    tagline: "Workhorse articulating arm for monitors & accessories",
    summary:
      "Dual-ball head magic arm with 1/4\"-20 screws on both ends. The unsung hero of every cage build.",
    specs: [
      "1/4\"-20 on both ends",
      "Lockable dual ball joints",
      "Aluminum construction",
    ],
    url: "https://www.bhphotovideo.com/c/product/1724549-REG/smallrig_3873_magic_arm_with_dual.html",
  },
  {
    id: "smallrig-vb99-mini",
    name: "SmallRig VB99 Mini V-Mount Kit (2 Batteries + Charger)",
    category: "power",
    retail: 469,
    daily: 35,
    weeklyMultiplier: 4,
    image: "images/products/smallrig-vb99-mini.jpg",
    tagline: "Compact V-mount power for cinema rigs",
    summary:
      "Two 99Wh V-mount batteries with USB-C PD passthrough charging. Travel-legal capacity, keeping the Pyxis, monitor and accessories running through long takes.",
    specs: [
      "2× 99 Wh V-mount (carry-on legal)",
      "USB-C PD in/out",
      "D-tap output + charge indicator",
    ],
    url: "https://www.bhphotovideo.com/c/product/1848329-REG/smallrig_vb99_mini_kit_with.html",
  },
  {
    id: "smallrig-freeblazer-tripod",
    name: "SmallRig FreeBlazer Heavy-Duty Carbon Tripod",
    category: "support",
    retail: 399,
    daily: 30,
    weeklyMultiplier: 4,
    image: "images/products/smallrig-freeblazer-tripod.jpg",
    tagline: "Carbon fiber tripod system for cinema builds",
    summary:
      "Stable, lightweight carbon-fiber legs rated for cinema payloads. Pairs cleanly with fluid heads for narrative or doc work.",
    specs: [
      "Carbon fiber, 25 kg payload",
      "75mm bowl",
      "Reverse-folding legs",
      "Includes shoulder bag",
    ],
    url: "https://www.bhphotovideo.com/c/product/1756221-REG/smallrig_3989_ad_100_heavy_duty_carbon_fiber.html",
  },
  {
    id: "angelbird-1tb-cfx",
    name: "Angelbird AV PRO SE 1TB CFexpress v4 Type B",
    category: "media",
    retail: 599.99,
    daily: 45,
    weeklyMultiplier: 4,
    image: "images/products/angelbird-1tb-cfx.jpg",
    tagline: "Sustained 12K capture without dropped frames",
    summary:
      "VPG-rated CFexpress v4 Type B card built for 12K Blackmagic RAW and 8K ProRes capture. Sustained write speeds for the longest takes.",
    specs: [
      "1 TB capacity, CFexpress v4 Type B",
      "VPG 800 sustained write",
      "Optimized for Blackmagic Pyxis 12K",
    ],
    url: "https://www.bhphotovideo.com/c/product/1876605-REG/angelbird_avp1t0cfxbsemk2_1tb_av_pro_se.html",
  },
  {
    id: "nanuk-935",
    name: "Nanuk 935 Wheeled Hard Case (Padded Dividers)",
    category: "case",
    retail: 319.95,
    daily: 20,
    weeklyMultiplier: 4,
    image: "images/products/nanuk-935.jpg",
    tagline: "Carry-on legal protection for camera builds",
    summary:
      "Lifetime-warranty resin shell with padded dividers, retractable handle, and silent wheels. IP67, airline carry-on legal.",
    specs: [
      "Carry-on legal (28.5 L)",
      "IP67 waterproof, dustproof",
      "Padded dividers + retractable handle",
      "Lifetime warranty",
    ],
    url: "https://www.bhphotovideo.com/c/product/1017200-REG/nanuk_935_2003_protective_935_case_with.html",
  },
  {
    id: "nisi-vnd-86",
    name: "NiSi True Color ND-VARIO Pro Nano (86mm, 1–5 Stop)",
    category: "filter",
    retail: 255,
    daily: 20,
    weeklyMultiplier: 4,
    image: "images/products/nisi-vnd-86.jpg",
    tagline: "True-color variable ND with no X-pattern",
    summary:
      "Variable ND with hard stops and exceptional color neutrality. 86mm with included step rings — perfect for pairing with the Arles set.",
    specs: [
      "1 to 5 stops variable ND",
      "True-color, no X-pattern at stops",
      "86mm thread + step-up rings",
      "Nano coatings",
    ],
    url: "https://www.bhphotovideo.com/c/product/1801435-REG/nisi_nir_tcvnd0_3_1_5_86_true_color_nd_vario_pro.html",
  },
];
